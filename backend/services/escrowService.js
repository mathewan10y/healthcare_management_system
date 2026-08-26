const Payment = require('../models/Payment');
const logger = require('../config/logger');

/**
 * Service to manage Escrow Financial Lifecycle for Appointments
 */
class EscrowService {
  /**
   * Release escrow held funds directly to the doctor upon verified completion
   */
  static async releaseToDoctor(appointment, session = null) {
    appointment.escrowStatus = 'released_to_doctor';
    appointment.escrowReleasedAt = new Date();
    
    appointment.systemLogs.push({
      action: 'ESCROW_RELEASED_DOCTOR',
      actor: 'system',
      details: {
        amount: appointment.escrowAmount,
        currency: 'INR',
        doctorId: appointment.doctorId,
        timestamp: new Date().toISOString(),
      },
    });

    if (session) {
      await appointment.save({ session });
    } else {
      await appointment.save();
    }

    logger.info(`Escrow released to doctor: Appointment ${appointment._id}, Amount: ₹${(appointment.escrowAmount / 100).toFixed(2)}`);
    return appointment;
  }

  /**
   * Refund escrow held funds in full back to the patient
   */
  static async refundToPatient(appointment, reason = 'Dispute ruled for patient / >24h cancellation', session = null) {
    appointment.escrowStatus = 'refunded_to_patient';
    appointment.escrowReleasedAt = new Date();

    // Create payment refund record
    try {
      const refundPayment = new Payment({
        patientId: appointment.patientId?._id || appointment.patientId,
        doctorId: appointment.doctorId?._id || appointment.doctorId,
        appointmentId: appointment._id,
        amount: appointment.escrowAmount,
        currency: 'INR',
        paymentType: 'refund',
        status: 'completed',
        stripeSessionId: `refund_session_${Date.now()}`,
        stripePaymentIntentId: `refund_escrow_${Date.now()}`,
        paymentDate: new Date(),
        metadata: {
          reason,
          appointmentId: appointment._id.toString(),
        },
      });
      await refundPayment.save();
    } catch (err) {
      logger.error('Error creating refund payment record:', err);
    }

    appointment.systemLogs.push({
      action: 'ESCROW_REFUNDED_PATIENT',
      actor: 'system',
      details: {
        amount: appointment.escrowAmount,
        currency: 'INR',
        reason,
        patientId: appointment.patientId,
        timestamp: new Date().toISOString(),
      },
    });

    if (session) {
      await appointment.save({ session });
    } else {
      await appointment.save();
    }

    logger.info(`Escrow refunded to patient: Appointment ${appointment._id}, Amount: ₹${(appointment.escrowAmount / 100).toFixed(2)}, Reason: ${reason}`);
    return appointment;
  }

  /**
   * Split escrow upon late cancellation (<24 hours) as penalty payout to doctor
   */
  static async applyLateCancellationPenalty(appointment, session = null) {
    appointment.escrowStatus = 'penalty_split';
    appointment.escrowReleasedAt = new Date();

    appointment.systemLogs.push({
      action: 'ESCROW_LATE_CANCELLATION_PENALTY',
      actor: 'system',
      details: {
        amount: appointment.escrowAmount,
        penaltyToDoctor: appointment.escrowAmount,
        reason: 'Patient cancelled less than 24 hours prior to appointment',
        timestamp: new Date().toISOString(),
      },
    });

    if (session) {
      await appointment.save({ session });
    } else {
      await appointment.save();
    }

    logger.info(`Escrow late cancellation penalty applied: Appointment ${appointment._id}`);
    return appointment;
  }

  /**
   * Calculate cancellation eligibility based on 24-hour UTC window policy
   * @param {Object} appointment 
   * @param {Boolean} isDoctorCancelling 
   * @returns {Object} { eligibleForFullRefund: boolean, hoursUntilAppointment: number }
   */
  static evaluateCancellationPolicy(appointment, isDoctorCancelling = false) {
    if (isDoctorCancelling) {
      return { eligibleForFullRefund: true, hoursUntilAppointment: Infinity, reason: 'Doctor initiated cancellation' };
    }

    // Determine start datetime of appointment in UTC
    const apptDate = new Date(appointment.date);
    const timeSlotStr = appointment.timeSlot || '09:00-09:30';
    const startTimePart = timeSlotStr.split('-')[0].trim();
    const [hours, minutes] = startTimePart.split(':').map(Number);

    const scheduledStartUTC = new Date(Date.UTC(
      apptDate.getUTCFullYear(),
      apptDate.getUTCMonth(),
      apptDate.getUTCDate(),
      hours || 9,
      minutes || 0,
      0
    ));

    const nowUTC = new Date();
    const diffMs = scheduledStartUTC.getTime() - nowUTC.getTime();
    const hoursUntilAppointment = diffMs / (1000 * 60 * 60);

    const eligibleForFullRefund = hoursUntilAppointment >= 24;

    return {
      eligibleForFullRefund,
      hoursUntilAppointment,
      scheduledStartUTC: scheduledStartUTC.toISOString(),
      reason: eligibleForFullRefund 
        ? `Cancelled ${hoursUntilAppointment.toFixed(1)}h before (>24h window), eligible for full refund`
        : `Cancelled ${hoursUntilAppointment.toFixed(1)}h before (<24h window), penalty policy applied`,
    };
  }
}

module.exports = EscrowService;
