const jwt = require('jsonwebtoken');
const Appointment = require('../models/Appointment');
const Prescription = require('../models/Prescription');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const EscrowService = require('../services/escrowService');
const { createNotification } = require('../utils/createNotification');
const logger = require('../config/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'healthcare_system_jwt_secret_key';

/**
 * Generate rolling cryptographic QR token for appointment check-in
 * GET /api/appointments/:id/qr-token
 */
exports.getQRToken = async (req, res) => {
  try {
    const { id } = req.params;
    const appointment = await Appointment.findById(id).populate('patientId', 'name email');

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    // Verify doctor ownership or admin
    if (req.user.role === 'doctor' && appointment.doctorId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to appointment QR' });
    }

    const currentUTC = Date.now();
    const payload = {
      appointmentId: appointment._id.toString(),
      doctorId: appointment.doctorId.toString(),
      patientId: appointment.patientId?._id?.toString() || appointment.patientId.toString(),
      timestamp: currentUTC,
      nonce: Math.random().toString(36).substring(2, 9),
    };

    // Sign rolling token valid for 30s (+5s clock grace)
    const qrToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '35s' });

    // Append system log (limit spam by checking last log time)
    const lastQrLog = appointment.systemLogs
      .filter(l => l.action === 'QR_GENERATED')
      .slice(-1)[0];
      
    if (!lastQrLog || (new Date() - new Date(lastQrLog.timestamp)) > 25000) {
      appointment.systemLogs.push({
        action: 'QR_GENERATED',
        actor: 'doctor',
        details: { timestamp: new Date(currentUTC).toISOString() },
      });
      await appointment.save();
    }

    res.json({
      success: true,
      data: {
        appointmentId: appointment._id,
        qrToken,
        offlinePin: appointment.offlinePin,
        expiresInSeconds: 30,
        generatedAt: new Date(currentUTC).toISOString(),
      },
    });
  } catch (error) {
    logger.error('Error generating QR token:', error);
    res.status(500).json({ success: false, message: 'Failed to generate QR token' });
  }
};

/**
 * Patient QR Check-in Endpoint (Idempotent)
 * POST /api/appointments/check-in
 */
exports.checkInWithQR = async (req, res) => {
  try {
    const { qrToken, appointmentId } = req.body;

    if (!qrToken) {
      return res.status(400).json({ success: false, message: 'QR token is required for check-in' });
    }

    // Decode & verify token
    let decoded;
    try {
      decoded = jwt.verify(qrToken, JWT_SECRET);
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: 'QR code has expired or is invalid. Please ask the doctor to refresh the screen.',
      });
    }

    // Enforce 30-second token freshness (allow 5s clock buffer)
    const tokenTimestamp = decoded.timestamp;
    const nowUTC = Date.now();
    const elapsedSeconds = (nowUTC - tokenTimestamp) / 1000;

    if (elapsedSeconds > 35) {
      return res.status(400).json({
        success: false,
        message: 'QR code is older than 30 seconds. Please scan the current refreshed QR code.',
      });
    }

    const targetAppointmentId = appointmentId || decoded.appointmentId;
    const appointment = await Appointment.findById(targetAppointmentId)
      .populate('patientId', 'name email')
      .populate('doctorId', 'name email');

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    // Ensure the patient scanning is the actual appointment patient (or bypass if testing)
    if (req.user.role === 'patient' && appointment.patientId._id.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You cannot check in for another patient\'s appointment' });
    }

    // Idempotent Check: If already Waiting or In_Progress
    if (appointment.status === 'Waiting' || appointment.status === 'In_Progress') {
      return res.json({
        success: true,
        message: `Already checked in (Status: ${appointment.status})`,
        data: appointment,
      });
    }

    if (appointment.status === 'Completed') {
      return res.status(400).json({ success: false, message: 'This appointment has already been completed' });
    }

    if (appointment.status === 'Cancelled') {
      return res.status(400).json({ success: false, message: 'Cannot check in to a cancelled appointment' });
    }

    // Validate Arrival Window
    const apptDate = new Date(appointment.date);
    const timeSlotStr = appointment.timeSlot || '09:00-09:30';
    const startTimePart = timeSlotStr.split('-')[0].trim();
    const [hours, minutes] = startTimePart.split(':').map(Number);

    const slotStartUTC = new Date(Date.UTC(
      apptDate.getUTCFullYear(),
      apptDate.getUTCMonth(),
      apptDate.getUTCDate(),
      hours || 9,
      minutes || 0,
      0
    ));

    // Allowed window: -15 mins before to +30 mins after (or full day buffer)
    const windowStart = new Date(slotStartUTC.getTime() - 15 * 60 * 1000);
    const windowEnd = new Date(slotStartUTC.getTime() + 60 * 60 * 1000);

    appointment.arrivalWindowStart = windowStart;
    appointment.arrivalWindowEnd = windowEnd;

    // Transition state
    appointment.status = 'Waiting';
    appointment.checkedInAt = new Date();
    appointment.checkInMethod = 'qr_scan';

    appointment.systemLogs.push({
      action: 'QR_CHECKIN_SUCCESS',
      actor: 'patient',
      details: {
        checkedInAt: appointment.checkedInAt.toISOString(),
        elapsedSeconds: elapsedSeconds.toFixed(1),
        method: 'qr_scan',
      },
    });

    await appointment.save();

    // Send notifications and socket events
    const io = req.app.get('io') || global.io;
    if (io) {
      io.to(`doctor_${appointment.doctorId._id}`).emit('appointment:waiting', {
        appointmentId: appointment._id,
        patientName: appointment.patientId.name,
        timeSlot: appointment.timeSlot,
        checkedInAt: appointment.checkedInAt,
        status: 'Waiting',
      });
      io.to(`appointment_${appointment._id}`).emit('appointment:updated', {
        appointmentId: appointment._id,
        status: 'Waiting',
      });
    }

    createNotification({
      recipient: appointment.doctorId._id,
      sender: appointment.patientId._id,
      type: 'APPOINTMENT_WAITING',
      title: 'Patient Checked In',
      message: `${appointment.patientId.name} has checked in via QR scan and is waiting in the queue.`,
      appointmentId: appointment._id,
    });

    logger.info(`Patient checked in via QR: Appointment ${appointment._id} is now Waiting`);

    res.json({
      success: true,
      message: 'Check-in successful! Doctor has been notified and you are now in the waiting room.',
      data: appointment,
    });
  } catch (error) {
    logger.error('Error during QR check-in:', error);
    res.status(500).json({ success: false, message: 'Check-in failed due to server error' });
  }
};

/**
 * Offline Bypass 6-digit PIN Check-in
 * POST /api/appointments/offline-bypass
 */
exports.checkInWithOfflinePin = async (req, res) => {
  try {
    const { appointmentId, pin } = req.body;

    if (!appointmentId || !pin) {
      return res.status(400).json({ success: false, message: 'Appointment ID and 6-digit PIN are required' });
    }

    const appointment = await Appointment.findById(appointmentId)
      .populate('patientId', 'name email')
      .populate('doctorId', 'name email');

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    // Validate PIN
    if (appointment.offlinePin !== pin.toString().trim()) {
      return res.status(400).json({ success: false, message: 'Invalid 6-digit bypass PIN. Please verify with the doctor.' });
    }

    // Idempotent Check
    if (appointment.status === 'Waiting' || appointment.status === 'In_Progress') {
      return res.json({
        success: true,
        message: `Already checked in (Status: ${appointment.status})`,
        data: appointment,
      });
    }

    appointment.status = 'Waiting';
    appointment.checkedInAt = new Date();
    appointment.checkInMethod = 'offline_pin';
    appointment.manual_bypass = true;

    appointment.systemLogs.push({
      action: 'OFFLINE_PIN_CHECKIN',
      actor: req.user?.role || 'patient',
      details: {
        checkedInAt: appointment.checkedInAt.toISOString(),
        manual_bypass: true,
        pinEntered: pin.toString().trim(),
      },
    });

    await appointment.save();

    const io = req.app.get('io') || global.io;
    if (io) {
      io.to(`doctor_${appointment.doctorId._id}`).emit('appointment:waiting', {
        appointmentId: appointment._id,
        patientName: appointment.patientId.name,
        timeSlot: appointment.timeSlot,
        checkedInAt: appointment.checkedInAt,
        status: 'Waiting',
        manual_bypass: true,
      });
      io.to(`appointment_${appointment._id}`).emit('appointment:updated', {
        appointmentId: appointment._id,
        status: 'Waiting',
      });
    }

    createNotification({
      recipient: appointment.doctorId._id,
      sender: appointment.patientId._id,
      type: 'APPOINTMENT_WAITING',
      title: 'Patient Checked In (Offline Bypass)',
      message: `${appointment.patientId.name} checked in using the 6-digit offline PIN.`,
      appointmentId: appointment._id,
    });

    logger.info(`Patient checked in via offline PIN: Appointment ${appointment._id}`);

    res.json({
      success: true,
      message: 'Offline bypass check-in verified! Status updated to Waiting.',
      data: appointment,
    });
  } catch (error) {
    logger.error('Error in offline bypass check-in:', error);
    res.status(500).json({ success: false, message: 'Failed to process offline PIN check-in' });
  }
};

/**
 * Doctor Starts Consultation
 * POST /api/appointments/:id/start
 */
exports.startConsultation = async (req, res) => {
  try {
    const { id } = req.params;
    const appointment = await Appointment.findById(id)
      .populate('patientId', 'name email')
      .populate('doctorId', 'name email');

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    if (appointment.doctorId._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized to start consultation' });
    }

    appointment.status = 'In_Progress';
    appointment.consultationStartedAt = new Date();

    appointment.systemLogs.push({
      action: 'CONSULTATION_STARTED',
      actor: 'doctor',
      details: {
        startedAt: appointment.consultationStartedAt.toISOString(),
      },
    });

    await appointment.save();

    const io = req.app.get('io') || global.io;
    if (io) {
      io.to(`patient_${appointment.patientId._id}`).emit('appointment:in_progress', {
        appointmentId: appointment._id,
        status: 'In_Progress',
        startedAt: appointment.consultationStartedAt,
      });
      io.to(`appointment_${appointment._id}`).emit('appointment:updated', {
        appointmentId: appointment._id,
        status: 'In_Progress',
      });
    }

    logger.info(`Consultation started for appointment ${appointment._id}`);

    res.json({
      success: true,
      message: 'Consultation is now in progress.',
      data: appointment,
    });
  } catch (error) {
    logger.error('Error starting consultation:', error);
    res.status(500).json({ success: false, message: 'Failed to start consultation' });
  }
};

/**
 * Doctor Completes Consultation (With Quality Control Enforcement)
 * POST /api/appointments/:id/complete
 */
exports.completeConsultation = async (req, res) => {
  try {
    const { id } = req.params;
    const { consultationNotes, no_medication_required } = req.body;

    const appointment = await Appointment.findById(id)
      .populate('patientId', 'name email')
      .populate('doctorId', 'name email');

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    if (appointment.doctorId._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized to complete consultation' });
    }

    // Quality Control Verification:
    // Must have consultation notes, OR no_medication_required flag, OR an existing linked prescription
    const existingPrescription = await Prescription.findOne({ appointmentId: appointment._id });
    const hasNotes = Boolean(consultationNotes && consultationNotes.trim().length > 0);
    const hasNoMedicationFlag = Boolean(no_medication_required);
    const hasPrescription = Boolean(existingPrescription);

    if (!hasNotes && !hasNoMedicationFlag && !hasPrescription) {
      return res.status(400).json({
        success: false,
        message: 'Quality Control Check: You must provide consultation notes, issue a prescription, or mark "No medication required" before completing the consultation.',
      });
    }

    appointment.status = 'Completed';
    appointment.consultationCompletedAt = new Date();
    if (hasNotes) appointment.consultationNotes = consultationNotes.trim();
    if (hasNoMedicationFlag) appointment.no_medication_required = true;

    appointment.systemLogs.push({
      action: 'CONSULTATION_COMPLETED',
      actor: 'doctor',
      details: {
        completedAt: appointment.consultationCompletedAt.toISOString(),
        hasPrescription,
        hasNotes,
        no_medication_required: appointment.no_medication_required,
      },
    });

    // Release Escrow to Doctor
    await EscrowService.releaseToDoctor(appointment);

    const io = req.app.get('io') || global.io;
    if (io) {
      io.to(`patient_${appointment.patientId._id}`).emit('appointment:completed', {
        appointmentId: appointment._id,
        status: 'Completed',
      });
      io.to(`appointment_${appointment._id}`).emit('appointment:updated', {
        appointmentId: appointment._id,
        status: 'Completed',
      });
    }

    createNotification({
      recipient: appointment.patientId._id,
      sender: appointment.doctorId._id,
      type: 'APPOINTMENT_COMPLETED',
      title: 'Consultation Completed',
      message: `Your appointment with Dr. ${appointment.doctorId.name} has been completed.`,
      appointmentId: appointment._id,
    });

    logger.info(`Consultation completed & escrow released for appointment ${appointment._id}`);

    res.json({
      success: true,
      message: 'Consultation completed successfully and escrow funds settled.',
      data: appointment,
    });
  } catch (error) {
    logger.error('Error completing consultation:', error);
    res.status(500).json({ success: false, message: 'Failed to complete consultation' });
  }
};

/**
 * Patient Initiates Dispute
 * POST /api/appointments/:id/dispute
 */
exports.reportDispute = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const appointment = await Appointment.findById(id)
      .populate('patientId', 'name email')
      .populate('doctorId', 'name email');

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    if (appointment.patientId._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized to dispute appointment' });
    }

    appointment.status = 'Disputed';
    appointment.escrowStatus = 'disputed';
    appointment.dispute = {
      initiatedBy: 'patient',
      reason: reason || 'Patient reported issue with check-in or doctor availability',
      createdAt: new Date(),
      status: 'pending_doctor',
    };

    appointment.systemLogs.push({
      action: 'DISPUTE_RAISED',
      actor: 'patient',
      details: {
        reason: appointment.dispute.reason,
        timestamp: new Date().toISOString(),
      },
    });

    await appointment.save();

    const io = req.app.get('io') || global.io;
    if (io) {
      io.to(`doctor_${appointment.doctorId._id}`).emit('appointment:disputed', {
        appointmentId: appointment._id,
        reason: appointment.dispute.reason,
      });
      io.to(`appointment_${appointment._id}`).emit('appointment:updated', {
        appointmentId: appointment._id,
        status: 'Disputed',
      });
    }

    createNotification({
      recipient: appointment.doctorId._id,
      sender: appointment.patientId._id,
      type: 'DISPUTE_RAISED',
      title: 'Appointment Dispute Reported',
      message: `${appointment.patientId.name} reported a check-in dispute for their appointment: "${appointment.dispute.reason}".`,
      appointmentId: appointment._id,
    });

    logger.info(`Dispute raised on appointment ${appointment._id}`);

    res.json({
      success: true,
      message: 'Dispute filed successfully. The doctor has been notified to respond.',
      data: appointment,
    });
  } catch (error) {
    logger.error('Error reporting dispute:', error);
    res.status(500).json({ success: false, message: 'Failed to report dispute' });
  }
};

/**
 * Doctor Responds to Dispute (Accept Fault & Refund OR Counter-Dispute)
 * POST /api/appointments/:id/doctor-dispute-response
 */
exports.doctorDisputeResponse = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, doctorNotes } = req.body; // 'accept_fault' | 'counter_dispute'

    if (!['accept_fault', 'counter_dispute'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Action must be "accept_fault" or "counter_dispute"' });
    }

    const appointment = await Appointment.findById(id)
      .populate('patientId', 'name email')
      .populate('doctorId', 'name email');

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    if (appointment.doctorId._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized to respond to dispute' });
    }

    if (!appointment.dispute) {
      return res.status(400).json({ success: false, message: 'No active dispute on this appointment' });
    }

    if (action === 'accept_fault') {
      // Auto-resolve: Refund patient
      appointment.status = 'Cancelled';
      appointment.dispute.status = 'resolved_patient';
      appointment.dispute.doctorResponse = 'accept_fault';
      appointment.dispute.doctorNotes = doctorNotes || 'Doctor accepted fault';
      appointment.dispute.doctorRespondedAt = new Date();
      appointment.dispute.resolvedAt = new Date();

      appointment.systemLogs.push({
        action: 'DISPUTE_DOCTOR_ACCEPTED_FAULT',
        actor: 'doctor',
        details: { doctorNotes: appointment.dispute.doctorNotes },
      });

      await EscrowService.refundToPatient(appointment, 'Doctor accepted fault for dispute');

      createNotification({
        recipient: appointment.patientId._id,
        sender: appointment.doctorId._id,
        type: 'DISPUTE_RESOLVED',
        title: 'Dispute Resolved - Refund Initiated',
        message: `Dr. ${appointment.doctorId.name} accepted fault for the dispute and a full refund has been credited.`,
        appointmentId: appointment._id,
      });

      res.json({
        success: true,
        message: 'Fault accepted. Full refund has been issued to the patient.',
        data: appointment,
      });
    } else {
      // Counter dispute: Escalate to Admin
      appointment.dispute.status = 'countered';
      appointment.dispute.doctorResponse = 'counter_dispute';
      appointment.dispute.doctorNotes = doctorNotes || 'Doctor contested dispute claim';
      appointment.dispute.doctorRespondedAt = new Date();

      appointment.systemLogs.push({
        action: 'DISPUTE_DOCTOR_COUNTERED',
        actor: 'doctor',
        details: { doctorNotes: appointment.dispute.doctorNotes },
      });

      await appointment.save();

      createNotification({
        recipient: appointment.patientId._id,
        sender: appointment.doctorId._id,
        type: 'DISPUTE_COUNTERED',
        title: 'Dispute Countered by Doctor',
        message: `Dr. ${appointment.doctorId.name} has counter-disputed. An admin will review system logs and make a ruling.`,
        appointmentId: appointment._id,
      });

      res.json({
        success: true,
        message: 'Counter-dispute recorded. The dispute is now escalated to the Admin Dispute Ledger.',
        data: appointment,
      });
    }

    const io = req.app.get('io') || global.io;
    if (io) {
      io.to(`appointment_${appointment._id}`).emit('appointment:updated', {
        appointmentId: appointment._id,
        status: appointment.status,
        dispute: appointment.dispute,
      });
    }
  } catch (error) {
    logger.error('Error handling doctor dispute response:', error);
    res.status(500).json({ success: false, message: 'Failed to process dispute response' });
  }
};

/**
 * Admin Retrieves All Disputes
 * GET /api/appointments/admin/disputes
 */
exports.getAdminDisputes = async (req, res) => {
  try {
    const disputes = await Appointment.find({
      $or: [
        { status: 'Disputed' },
        { 'dispute.status': { $in: ['pending_doctor', 'countered', 'resolved_patient', 'resolved_doctor'] } },
      ],
    })
      .populate('patientId', 'name email district')
      .populate('doctorId', 'name email district')
      .sort({ updatedAt: -1 });

    res.json({
      success: true,
      data: disputes,
      count: disputes.length,
    });
  } catch (error) {
    logger.error('Error fetching admin disputes:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch disputes' });
  }
};

/**
 * Admin Rules on Dispute
 * POST /api/appointments/admin/disputes/:id/resolve
 */
exports.resolveAdminDispute = async (req, res) => {
  try {
    const { id } = req.params;
    const { ruling, resolutionNotes } = req.body; // 'patient' | 'doctor'

    if (!['patient', 'doctor'].includes(ruling)) {
      return res.status(400).json({ success: false, message: 'Ruling must be either "patient" or "doctor"' });
    }

    const appointment = await Appointment.findById(id)
      .populate('patientId', 'name email')
      .populate('doctorId', 'name email');

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    appointment.dispute = appointment.dispute || {};
    appointment.dispute.status = ruling === 'patient' ? 'resolved_patient' : 'resolved_doctor';
    appointment.dispute.resolutionNotes = resolutionNotes || `Admin ruled in favor of ${ruling}`;
    appointment.dispute.resolvedBy = req.user.id;
    appointment.dispute.resolvedAt = new Date();

    if (ruling === 'patient') {
      appointment.status = 'Cancelled';
      appointment.systemLogs.push({
        action: 'DISPUTE_RULED_PATIENT',
        actor: 'admin',
        details: { resolutionNotes: appointment.dispute.resolutionNotes },
      });
      await EscrowService.refundToPatient(appointment, 'Admin ruled in favor of patient');
    } else {
      appointment.status = 'Completed';
      appointment.systemLogs.push({
        action: 'DISPUTE_RULED_DOCTOR',
        actor: 'admin',
        details: { resolutionNotes: appointment.dispute.resolutionNotes },
      });
      await EscrowService.releaseToDoctor(appointment);
    }

    const io = req.app.get('io') || global.io;
    if (io) {
      io.to(`patient_${appointment.patientId._id}`).emit('dispute:resolved', {
        appointmentId: appointment._id,
        ruling,
        resolutionNotes: appointment.dispute.resolutionNotes,
      });
      io.to(`doctor_${appointment.doctorId._id}`).emit('dispute:resolved', {
        appointmentId: appointment._id,
        ruling,
        resolutionNotes: appointment.dispute.resolutionNotes,
      });
      io.to(`appointment_${appointment._id}`).emit('appointment:updated', {
        appointmentId: appointment._id,
        status: appointment.status,
        dispute: appointment.dispute,
      });
    }

    logger.info(`Admin ruled dispute on appointment ${appointment._id} in favor of ${ruling}`);

    res.json({
      success: true,
      message: `Dispute successfully resolved in favor of ${ruling}. Escrow ledger settled.`,
      data: appointment,
    });
  } catch (error) {
    logger.error('Error resolving admin dispute:', error);
    res.status(500).json({ success: false, message: 'Failed to resolve dispute' });
  }
};

/**
 * Cancel Appointment Enforcing 24-Hour Escrow Policy
 * POST /api/appointments/:id/cancel
 */
exports.cancelAppointmentWithPolicy = async (req, res) => {
  try {
    const { id } = req.params;
    const isDoctor = req.user.role === 'doctor';

    const appointment = await Appointment.findById(id)
      .populate('patientId', 'name email')
      .populate('doctorId', 'name email');

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    // Verify cancellation ownership
    if (req.user.role === 'patient' && appointment.patientId._id.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized to cancel this appointment' });
    }
    if (req.user.role === 'doctor' && appointment.doctorId._id.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized to cancel this appointment' });
    }

    if (appointment.status === 'Completed' || appointment.status === 'Cancelled') {
      return res.status(400).json({ success: false, message: `Appointment is already ${appointment.status}` });
    }

    const evaluation = EscrowService.evaluateCancellationPolicy(appointment, isDoctor);

    appointment.status = 'Cancelled';
    appointment.systemLogs.push({
      action: 'APPOINTMENT_CANCELLED',
      actor: isDoctor ? 'doctor' : 'patient',
      details: {
        isDoctorCancelling: isDoctor,
        eligibleForFullRefund: evaluation.eligibleForFullRefund,
        hoursUntilAppointment: evaluation.hoursUntilAppointment,
        reason: evaluation.reason,
      },
    });

    if (evaluation.eligibleForFullRefund) {
      await EscrowService.refundToPatient(appointment, evaluation.reason);
    } else {
      await EscrowService.applyLateCancellationPenalty(appointment);
    }

    const io = req.app.get('io') || global.io;
    if (io) {
      io.to(`appointment_${appointment._id}`).emit('appointment:updated', {
        appointmentId: appointment._id,
        status: 'Cancelled',
      });
    }

    logger.info(`Appointment ${appointment._id} cancelled by ${isDoctor ? 'doctor' : 'patient'}. Policy: ${evaluation.reason}`);

    res.json({
      success: true,
      message: evaluation.eligibleForFullRefund
        ? 'Appointment cancelled with full escrow refund.'
        : 'Appointment cancelled less than 24 hours prior. Late cancellation penalty policy applied.',
      data: {
        appointment,
        refundPolicy: evaluation,
      },
    });
  } catch (error) {
    logger.error('Error cancelling appointment with policy:', error);
    res.status(500).json({ success: false, message: 'Failed to cancel appointment' });
  }
};
