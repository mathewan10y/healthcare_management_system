const mongoose = require('mongoose');
const MedicalHistory = require('../models/MedicalHistory');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const Prescription = require('../models/Prescription');
const Bill = require('../models/Bill');
const User = require('../models/User');
const { createNotification } = require('../utils/createNotification');

// Utility function to normalize date to UTC midnight
const normalizeDateToUTC = (dateString) => {
  const date = new Date(dateString);
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0));
};

exports.getMedicalHistory = async (req, res) => {
  try {
    const mh = await MedicalHistory.findOne({ patientId: req.user.id });
    if (!mh) return res.status(404).json({ success: false, message: 'Medical history not found' });
    res.json({ success: true, data: mh });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateMedicalHistory = async (req, res) => {
  const { bloodType, allergies, pastConditions } = req.body;
  try {
    let mh = await MedicalHistory.findOne({ patientId: req.user.id });
    if (!mh) {
      mh = await MedicalHistory.create({
        patientId: req.user.id,
        bloodType,
        allergies: allergies || [],
        pastConditions: pastConditions || [],
      });
    } else {
      mh.bloodType = bloodType ?? mh.bloodType;
      mh.allergies = allergies ?? mh.allergies;
      mh.pastConditions = pastConditions ?? mh.pastConditions;
      mh.lastUpdated = Date.now();
      await mh.save();
    }
    res.json({ success: true, data: mh });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getDoctors = async (req, res) => {
  try {
    const { district, search, specializationId, page = 1, limit = 20 } = req.query;

    // The aggregation pipeline. We perform lookups first to get all necessary data.
    const pipeline = [
      // 1. Start with approved doctors
      {
        $match: { verificationStatus: 'Approved' }
      },
      // 2. Join with the 'users' collection to get doctor's name, email, etc.
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'userId'
        }
      },
      { $unwind: '$userId' },
      // 3. Join with 'specializations' collection to get specialization name
      {
        $lookup: {
          from: 'specializations',
          localField: 'specializationId',
          foreignField: '_id',
          as: 'specializationId'
        }
      },
      { $unwind: '$specializationId' },
      // 4. Join with 'hospitals' collection to get hospital details
      {
        $lookup: {
          from: 'hospitals',
          localField: 'hospitalId',
          foreignField: '_id',
          as: 'hospitalId'
        }
      },
      { $unwind: { path: '$hospitalId', preserveNullAndEmptyArrays: true } }
    ];

    // 4. Build a dynamic and consolidated match stage for all filters
    const matchConditions = [];

    if (district) {
      // Filter by the district field on the Doctor model
      matchConditions.push({ district: district });
    }

    if (specializationId && mongoose.Types.ObjectId.isValid(specializationId)) {
      // Filter by the specialization's ID (which is now an object after the lookup)
      matchConditions.push({ 'specializationId._id': new mongoose.Types.ObjectId(specializationId) });
    }

    if (search && search.trim()) {
      const searchRegex = { $regex: search.trim(), $options: 'i' };
      // Search across multiple fields from the joined collections
      matchConditions.push({
        $or: [
          { 'userId.name': searchRegex },
          { 'specializationId.name': searchRegex },
          { qualifications: searchRegex },
          { bio: searchRegex }
        ]
      });
    }

    // 5. If there are any filters, add them to the pipeline in a single $match stage
    if (matchConditions.length > 0) {
      pipeline.push({ $match: { $and: matchConditions } });
    }

    // 6. Add sorting fields after all filtering is done
    pipeline.push({
      $addFields: {
        averageRating: {
          $cond: {
            if: { $gt: [{ $size: { $ifNull: ['$ratings', []] } }, 0] },
            then: { $avg: '$ratings' },
            else: 0
          }
        }
      }
    });

    pipeline.push({
      $sort: {
        averageRating: -1,
        'userId.name': 1
      }
    });

    // 7. Handle Pagination
    // Create a parallel pipeline to get the total count *before* applying skip/limit
    const countPipeline = [...pipeline, { $count: 'total' }];

    // Add pagination to the main data pipeline
    const skip = (parseInt(page) - 1) * parseInt(limit);
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: parseInt(limit) });

    // Execute both pipelines concurrently for efficiency
    const [doctors, countResult] = await Promise.all([
      Doctor.aggregate(pipeline),
      Doctor.aggregate(countPipeline)
    ]);

    const totalCount = countResult[0]?.total || 0;

    res.json({
      success: true,
      count: doctors.length,
      total: totalCount,
      page: parseInt(page),
      pages: Math.ceil(totalCount / parseInt(limit)),
      data: doctors
    });
  } catch (e) {
    console.error('Error fetching doctors:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};


exports.getAvailableSlots = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ success: false, message: 'Date is required' });
    }

    const doctor = await Doctor.findOne({ userId: doctorId });
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    const dateObj = normalizeDateToUTC(date);
    const dayIndex = dateObj.getDay();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayNames[dayIndex];

    const dayAvailability = doctor.availability.find(av =>
      (av.day || '').toLowerCase() === dayName.toLowerCase()
    );

    if (!dayAvailability || !dayAvailability.slots) {
      return res.json({ success: true, data: [] });
    }

    const expandTimeRange = (timeRange) => {
      const [startTime, endTime] = timeRange.split('-');
      const slots = [];

      const parseTime = (timeStr) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
      };

      const formatTime = (minutes) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
      };

      const startMinutes = parseTime(startTime);
      const endMinutes = parseTime(endTime);

      for (let time = startMinutes; time < endMinutes; time += 30) {
        const slotStart = formatTime(time);
        const slotEnd = formatTime(time + 30);
        slots.push(`${slotStart}-${slotEnd}`);
      }

      return slots;
    };

    const allAvailableSlots = [];
    dayAvailability.slots.forEach(range => {
      allAvailableSlots.push(...expandTimeRange(range));
    });

    const bookedAppointments = await Appointment.find({
      doctorId: doctorId,
      date: dateObj,
      status: 'Scheduled'
    }).select('timeSlot');

    const bookedSlots = bookedAppointments.map(apt => apt.timeSlot);

    const availableSlots = allAvailableSlots.filter(slot =>
      !bookedSlots.includes(slot)
    );

    res.json({
      success: true,
      data: availableSlots
    });
  } catch (error) {
    console.error('Error getting available slots:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.bookAppointment = async (req, res) => {
  const { doctorId, date, timeSlot } = req.body;
  try {
    // Normalize date to UTC midnight for consistent storage
    const normalizedDate = normalizeDateToUTC(date);

    const existing = await Appointment.findOne({ doctorId, date: normalizedDate, timeSlot, status: 'Scheduled' });
    if (existing) return res.status(400).json({ success: false, message: 'Time slot not available' });

    const appt = await Appointment.create({ patientId: req.user.id, doctorId, date: normalizedDate, timeSlot });

    const populatedAppt = await Appointment.findById(appt._id)
      .populate('patientId', 'name')
      .populate('doctorId', 'name');

    await createNotification(
      doctorId,
      `You have a new appointment with ${populatedAppt.patientId.name} on ${new Date(date).toLocaleDateString()} at ${timeSlot}`,
      '/doctor/appointments',
      'appointment',
      { appointmentId: appt._id, patientName: populatedAppt.patientId.name, date, timeSlot }
    );

    await createNotification(
      req.user.id,
      `Your appointment with Dr. ${populatedAppt.doctorId.name} for ${new Date(date).toLocaleDateString()} is confirmed`,
      '/patient/appointments',
      'appointment',
      { appointmentId: appt._id, doctorName: populatedAppt.doctorId.name, date, timeSlot }
    );

    res.status(201).json({ success: true, data: appt });
  } catch (e) {
    if (e.code === 11000) return res.status(400).json({ success: false, message: 'Duplicate slot' });
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getAppointments = async (req, res) => {
  try {
    const appts = await Appointment.find({ patientId: req.user.id })
      .populate('doctorId', 'name')
      .sort({ date: 1, timeSlot: 1 });
    res.json({ success: true, count: appts.length, data: appts });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getPrescriptions = async (req, res) => {
  try {
    const pres = await Prescription.find({ patientId: req.user.id }).populate('doctorId', 'name').sort({ dateIssued: -1 });
    res.json({ success: true, count: pres.length, data: pres });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * POST /api/patients/refill/quote
 * Body: { items: [{ prescriptionId, medicineName, quantity }] }
 * Returns a computed bill quote for selected medicines using hospital inventory prices when available.
 */
exports.getRefillQuote = async (req, res) => {
  try {
    const patientId = req.user.id;
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'No items selected' });
    }

    const Inventory = require('../models/Inventory');
    const Doctor = require('../models/Doctor');

    // Load all referenced prescriptions that belong to this patient
    const prescriptionIds = [...new Set(items.map(i => i.prescriptionId).filter(Boolean))];
    const prescriptions = await Prescription.find({ _id: { $in: prescriptionIds }, patientId })
      .select('doctorId');

    // Build quick lookup maps
    const prescIdToDoctorId = new Map();
    prescriptions.forEach(p => prescIdToDoctorId.set(p._id.toString(), p.doctorId.toString()));

    // Cache doctor profiles -> hospitalId to avoid repeated queries
    const doctorToHospitalCache = new Map();

    const lineItems = [];
    let totalAmount = 0;

    for (const it of items) {
      const prescriptionId = String(it.prescriptionId || '');
      const medicineName = String(it.medicineName || '').trim();
      const quantity = Math.max(1, Number(it.quantity || 1));

      if (!prescIdToDoctorId.has(prescriptionId)) {
        return res.status(400).json({ success: false, message: 'Invalid prescription selected' });
      }

      const doctorUserId = prescIdToDoctorId.get(prescriptionId);

      // Resolve hospital for the doctor
      let hospitalId = doctorToHospitalCache.get(doctorUserId) || null;
      if (hospitalId === null && !doctorToHospitalCache.has(doctorUserId)) {
        const docProfile = await Doctor.findOne({ userId: doctorUserId }).select('hospitalId');
        hospitalId = docProfile?.hospitalId || null;
        doctorToHospitalCache.set(doctorUserId, hospitalId);
      }

      let unitPrice = 0;
      let inventoryItemId = null;
      if (hospitalId && medicineName) {
        const inv = await Inventory.findOne({
          hospitalId,
          medicineName: { $regex: new RegExp(`^${medicineName}$`, 'i') },
          isActive: true
        });
        if (inv) {
          unitPrice = inv.price;
          inventoryItemId = inv._id;
        }
      }

      lineItems.push({ description: medicineName, quantity, amount: unitPrice, inventoryItemId });
      totalAmount += unitPrice * quantity;
    }

    return res.json({ success: true, data: { items: lineItems, totalAmount: Math.round(totalAmount) } });
  } catch (error) {
    console.error('Error computing refill quote:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * POST /api/patients/refill
 * Body: { items: [{ prescriptionId, medicineName, quantity }] }
 * Creates a Bill for the selected refill medicines using hospital inventory pricing.
 * Constraints: all items must belong to the same prescription (same doctor context).
 */
exports.createRefillBill = async (req, res) => {
  try {
    const patientId = req.user.id;
    const { items, notes } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'No items selected' });
    }

    const Inventory = require('../models/Inventory');
    const Doctor = require('../models/Doctor');
    const Bill = require('../models/Bill');

    // Validate prescriptions belong to patient and enforce single-prescription selection
    const prescriptionIds = [...new Set(items.map(i => String(i.prescriptionId || '')).filter(Boolean))];
    if (prescriptionIds.length !== 1) {
      return res.status(400).json({ success: false, message: 'Select medicines from a single prescription for refill' });
    }

    const prescription = await Prescription.findOne({ _id: prescriptionIds[0], patientId })
      .select('doctorId appointmentId');
    if (!prescription) {
      return res.status(404).json({ success: false, message: 'Prescription not found' });
    }

    const doctorUserId = prescription.doctorId.toString();
    const docProfile = await Doctor.findOne({ userId: doctorUserId }).select('hospitalId');
    if (!docProfile || !docProfile.hospitalId) {
      return res.status(400).json({ success: false, message: 'Doctor has no associated hospital for inventory pricing' });
    }

    const hospitalId = docProfile.hospitalId;

    const lineItems = [];
    let totalAmount = 0;

    for (const it of items) {
      const medicineName = String(it.medicineName || '').trim();
      const quantity = Math.max(1, Number(it.quantity || 1));

      const inv = await Inventory.findOne({
        hospitalId,
        medicineName: { $regex: new RegExp(`^${medicineName}$`, 'i') },
        isActive: true
      });

      if (!inv) {
        return res.status(404).json({ success: false, message: `Medicine "${medicineName}" not found in hospital inventory` });
      }

      // Stock is validated on payment in the existing flow; still do a soft check here
      if (inv.stockQuantity < quantity) {
        return res.status(400).json({ success: false, message: `Insufficient stock for "${medicineName}". Available: ${inv.stockQuantity}, Required: ${quantity}` });
      }

      lineItems.push({
        description: medicineName,
        quantity,
        amount: inv.price,
        inventoryItemId: inv._id
      });
      totalAmount += inv.price * quantity;
    }

    const bill = new Bill({
      appointmentId: prescription.appointmentId, // tie to original consultation
      patientId,
      doctorId: doctorUserId,
      items: lineItems,
      totalAmount: Math.round(totalAmount),
      notes: notes || 'Prescription refill',
      status: 'unpaid'
    });

    await bill.save();

    await bill.populate('doctorId', 'name');
    await bill.populate('appointmentId', 'date timeSlot');

    return res.status(201).json({ success: true, message: 'Refill bill created', data: { bill } });
  } catch (error) {
    console.error('Error creating refill bill:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get a single prescription for the logged-in patient
exports.getPrescriptionById = async (req, res) => {
  try {
    const { id } = req.params;
    const patientId = req.user.id;

    const prescription = await Prescription.findById(id)
      .populate('patientId', 'name email')
      .populate('doctorId', 'name')
      .populate('appointmentId', 'date timeSlot status');

    if (!prescription) {
      return res.status(404).json({ success: false, message: 'Prescription not found' });
    }

    if (prescription.patientId._id.toString() !== patientId) {
      return res.status(403).json({ success: false, message: 'Unauthorized access' });
    }

    res.json({ success: true, data: prescription });
  } catch (error) {
    console.error('Error fetching patient prescription:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.cancelAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;

    const appointment = await Appointment.findById(appointmentId)
      .populate('patientId', 'name')
      .populate('doctorId', 'name');

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    if (appointment.patientId._id.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized to cancel this appointment' });
    }

    if (appointment.status === 'Cancelled') {
      return res.status(400).json({ success: false, message: 'Appointment is already cancelled' });
    }

    if (appointment.status === 'Completed') {
      return res.status(400).json({ success: false, message: 'Cannot cancel a completed appointment' });
    }

    try {
      const now = new Date();

      let appointmentDate;
      if (typeof appointment.date === 'string') {
        appointmentDate = new Date(appointment.date + 'T00:00:00');
      } else {
        appointmentDate = new Date(appointment.date);
      }

      let timeSlot = appointment.timeSlot || '';

      let startTime = timeSlot;
      if (timeSlot.includes('-')) {
        startTime = timeSlot.split('-')[0].trim();
      }

      if (!startTime.includes(':')) {
        startTime = startTime + ':00';
      }

      const appointmentDateTime = new Date(appointmentDate);
      const [hours, minutes] = startTime.split(':').map(Number);
      appointmentDateTime.setHours(hours, minutes, 0, 0);

      const timeDiffMs = appointmentDateTime.getTime() - now.getTime();
      const timeDiffHours = timeDiffMs / (1000 * 60 * 60);

      if (timeDiffMs < 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot cancel a past appointment'
        });
      }

      if (timeDiffHours < 1) {
        const minutesRemaining = Math.max(0, Math.floor(timeDiffMs / (1000 * 60)));
        return res.status(400).json({
          success: false,
          message: `Cannot cancel appointment. Only ${minutesRemaining} minutes remaining.`
        });
      }
    } catch (error) {
      console.error('Error checking appointment cancellation eligibility in backend:', error);
      return res.status(500).json({
        success: false,
        message: 'Error validating appointment cancellation time'
      });
    }

    appointment.status = 'Cancelled';
    await appointment.save();

    await createNotification(
      appointment.doctorId._id,
      `Appointment with ${appointment.patientId.name} on ${new Date(appointment.date).toLocaleDateString()} at ${appointment.timeSlot} has been cancelled`,
      '/doctor/appointments',
      'appointment',
      {
        appointmentId: appointment._id,
        patientName: appointment.patientId.name,
        date: appointment.date,
        timeSlot: appointment.timeSlot,
        action: 'cancelled'
      }
    );

    await createNotification(
      req.user.id,
      `Your appointment with Dr. ${appointment.doctorId.name} for ${new Date(appointment.date).toLocaleDateString()} has been cancelled`,
      '/patient/appointments',
      'appointment',
      {
        appointmentId: appointment._id,
        doctorName: appointment.doctorId.name,
        date: appointment.date,
        timeSlot: appointment.timeSlot,
        action: 'cancelled'
      }
    );

    res.json({
      success: true,
      message: 'Appointment cancelled successfully',
      data: appointment
    });
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.rateAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    let { rating } = req.body;
    rating = Number(rating);

    if (req.user.role !== 'patient') {
      return res.status(403).json({ success: false, message: 'Only patients can rate appointments' });
    }

    if (!rating || rating < 1 || 5 < rating) {
      return res.status(400).json({ success: false, message: 'Rating must be a number between 1 and 5' });
    }

    const appt = await Appointment.findById(appointmentId);
    if (!appt || appt.patientId.toString() !== req.user.id) {
      return res.status(404).json({ success: false, message: 'Appointment not found or unauthorized' });
    }
    if (appt.status !== 'Completed') {
      return res.status(400).json({ success: false, message: 'Appointment not completed' });
    }
    if (appt.isRated) {
      return res.status(400).json({ success: false, message: 'Appointment already rated' });
    }

    await Doctor.updateOne({ userId: appt.doctorId }, { $push: { ratings: rating } });
    appt.isRated = true;
    await appt.save();

    res.json({ success: true, message: 'Rating submitted' });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Cancel appointment with refund policy
 * Policy: If cancelled more than 3 days in advance, 50% refund
 */
exports.cancelAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const patientId = req.user.id;

    // Fetch the appointment
    const appointment = await Appointment.findById(id).populate('doctorId', 'name');

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    // Verify ownership
    if (appointment.patientId.toString() !== patientId) {
      return res.status(403).json({ success: false, message: 'Unauthorized access' });
    }

    // Check if appointment can be cancelled
    if (appointment.status === 'Completed') {
      return res.status(400).json({ success: false, message: 'Cannot cancel completed appointment' });
    }

    if (appointment.status.includes('cancelled')) {
      return res.status(400).json({ success: false, message: 'Appointment already cancelled' });
    }

    // Check if booking fee was paid
    if (appointment.bookingFeeStatus !== 'paid') {
      // No payment made, just cancel
      appointment.status = 'cancelled_no_refund';
      await appointment.save();

      // Send notification to doctor
      await createNotification(
        appointment.doctorId._id,
        `Appointment cancelled by patient`,
        `/doctor/appointments`,
        'appointment'
      );

      return res.json({
        success: true,
        message: 'Appointment cancelled successfully',
        refundEligible: false
      });
    }

    // Calculate days until appointment
    const now = new Date();
    const appointmentDate = new Date(appointment.date);
    const daysUntilAppointment = Math.ceil((appointmentDate - now) / (1000 * 60 * 60 * 24));

    // Determine refund eligibility (more than 3 days in advance = 50% refund)
    const isRefundEligible = daysUntilAppointment > 3;

    if (isRefundEligible) {
      // 50% refund
      const Payment = require('../models/Payment');
      const Doctor = require('../models/Doctor');

      // Get the doctor's consultation fee
      const doctorProfile = await Doctor.findOne({ userId: appointment.doctorId });
      const consultationFee = doctorProfile?.consultationFee || 25000;
      const refundAmount = Math.floor(consultationFee * 0.5); // 50% refund

      // Create mock refund payment record
      const refundPayment = new Payment({
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        appointmentId: appointment._id,
        amount: refundAmount,
        paymentType: 'refund',
        stripeSessionId: `refund_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        stripePaymentIntentId: `refund_pay_${Date.now()}`,
        status: 'completed',
        paymentDate: new Date(),
        metadata: {
          reason: 'Appointment cancelled more than 3 days in advance',
          refundPercentage: 50,
          originalAmount: consultationFee
        }
      });

      await refundPayment.save();

      appointment.status = 'cancelled_refunded';
      await appointment.save();

      // Send notifications
      await createNotification(
        patientId,
        `50% refund processed for cancelled appointment`,
        `/patient/bills`,
        'refund'
      );

      await createNotification(
        appointment.doctorId._id,
        `Appointment cancelled by patient (refunded)`,
        `/doctor/appointments`,
        'appointment'
      );

      return res.json({
        success: true,
        message: 'Appointment cancelled successfully. 50% refund processed.',
        refundEligible: true,
        refundAmount: refundAmount,
        refundPercentage: 50
      });
    } else {
      // No refund (less than 3 days notice)
      appointment.status = 'cancelled_no_refund';
      await appointment.save();

      // Send notifications
      await createNotification(
        patientId,
        `Appointment cancelled. No refund (less than 3 days notice)`,
        `/patient/appointments`,
        'appointment'
      );

      await createNotification(
        appointment.doctorId._id,
        `Appointment cancelled by patient (no refund)`,
        `/doctor/appointments`,
        'appointment'
      );

      return res.json({
        success: true,
        message: 'Appointment cancelled. No refund eligible (less than 3 days notice).',
        refundEligible: false,
        daysUntilAppointment: daysUntilAppointment
      });
    }
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    res.status(500).json({ success: false, message: 'Failed to cancel appointment' });
  }
};

/**
 * Get comprehensive patient file (for doctors)
 * Includes: patient details, medical history, appointments, prescriptions, bills
 * GET /api/patients/:patientId/file
 */
exports.getPatientFile = async (req, res) => {
  try {
    const { patientId } = req.params;
    const doctorId = req.user.id;

    // Validate that requester is a doctor
    if (req.user.role !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'Only doctors can access patient files'
      });
    }

    // Verify patient exists
    const patient = await User.findById(patientId).select('-password');
    if (!patient || patient.role !== 'patient') {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Get medical history
    const medicalHistory = await MedicalHistory.findOne({ patientId })
      .populate('createdBy', 'name')
      .populate('lastUpdatedBy', 'name');

    // Get all appointments (sorted by date, most recent first)
    const appointments = await Appointment.find({ patientId })
      .populate('doctorId', 'name email')
      .sort({ date: -1, timeSlot: -1 });

    // Get all prescriptions (sorted by date issued, most recent first)
    const prescriptions = await Prescription.find({ patientId })
      .populate('doctorId', 'name')
      .populate('appointmentId', 'date timeSlot')
      .sort({ dateIssued: -1 });

    // Get all bills (sorted by creation date, most recent first)
    const bills = await Bill.find({ patientId })
      .populate('doctorId', 'name')
      .populate('appointmentId', 'date timeSlot')
      .sort({ createdAt: -1 });

    // Compile patient file
    const patientFile = {
      patient: {
        id: patient._id,
        name: patient.name,
        email: patient.email,
        district: patient.district,
        photoUrl: patient.photoUrl,
        createdAt: patient.createdAt
      },
      medicalHistory: medicalHistory || null,
      appointments: {
        total: appointments.length,
        upcoming: appointments.filter(a =>
          new Date(a.date) >= new Date() && a.status === 'Scheduled'
        ).length,
        completed: appointments.filter(a => a.status === 'Completed').length,
        cancelled: appointments.filter(a =>
          a.status.includes('cancelled') || a.status === 'Cancelled'
        ).length,
        data: appointments
      },
      prescriptions: {
        total: prescriptions.length,
        data: prescriptions
      },
      bills: {
        total: bills.length,
        unpaid: bills.filter(b => b.status === 'unpaid').length,
        paid: bills.filter(b => b.status === 'paid').length,
        totalUnpaidAmount: bills
          .filter(b => b.status === 'unpaid')
          .reduce((sum, b) => sum + b.totalAmount, 0),
        data: bills
      }
    };

    res.json({
      success: true,
      data: patientFile
    });
  } catch (error) {
    console.error('Error fetching patient file:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch patient file'
    });
  }
};

/**
 * Search patients (for doctors to find patient files)
 * GET /api/patients/search?query=name
 */
exports.searchPatients = async (req, res) => {
  try {
    const { query } = req.query;
    const doctorId = req.user.id;

    // Validate that requester is a doctor or admin
    if (req.user.role !== 'doctor' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only doctors and admins can search patients'
      });
    }

    if (!query || query.trim().length < 1) {
      return res.json({
        success: true,
        data: []
      });
    }

    const trimmedQuery = query.trim();
    const searchRegex = new RegExp(trimmedQuery, 'i');

    // Prefer patients who have interacted with this doctor, but also fall back to global search
    const appointmentPatientIds = await Appointment.find({ doctorId }).distinct('patientId');

    const baseCriteria = {
      role: 'patient',
      $or: [
        { name: searchRegex },
        { email: searchRegex }
      ]
    };

    // First, search among patients who had appointments with this doctor
    const preferredPatients = await User.find({
      ...baseCriteria,
      _id: { $in: appointmentPatientIds }
    }).select('name email district photoUrl').limit(20);

    let patients = preferredPatients;

    // If fewer than 20 found, search broadly across all patients
    if (patients.length < 20) {
      const remainingLimit = 20 - patients.length;
      const existingIds = patients.map(p => p._id);
      const additionalPatients = await User.find({
        ...baseCriteria,
        _id: { $nin: existingIds }
      })
        .select('name email district photoUrl')
        .limit(remainingLimit);

      patients = [...patients, ...additionalPatients];
    }

    res.json({
      success: true,
      count: patients.length,
      data: patients
    });
  } catch (error) {
    console.error('Error searching patients:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search patients'
    });
  }
};