const mongoose = require('mongoose');

const systemLogSchema = new mongoose.Schema(
  {
    timestamp: { type: Date, default: Date.now },
    action: { type: String, required: true },
    actor: { type: String, default: 'system' }, // 'patient' | 'doctor' | 'admin' | 'system'
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const disputeSchema = new mongoose.Schema(
  {
    initiatedBy: { type: String, enum: ['patient', 'doctor'], default: 'patient' },
    reason: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['pending_doctor', 'countered', 'resolved_patient', 'resolved_doctor'],
      default: 'pending_doctor',
    },
    doctorResponse: { type: String, enum: ['accept_fault', 'counter_dispute', null], default: null },
    doctorNotes: { type: String, default: '' },
    doctorRespondedAt: { type: Date },
    resolutionNotes: { type: String, default: '' },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date },
  },
  { _id: false }
);

const appointmentSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    timeSlot: { type: String, required: true },
    status: { 
      type: String, 
      enum: [
        'Scheduled',
        'Waiting',
        'In_Progress',
        'Completed',
        'Disputed',
        'Cancelled',
        'Missed',
        'Patient_No_Show',
        'cancelled_refunded',
        'cancelled_no_refund'
      ], 
      default: 'Scheduled' 
    },
    rejectionReason: { type: String, default: '' },
    rescheduledTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
    notes: { type: String, default: '' },
    isRated: { type: Boolean, default: false },
    bookingFeeStatus: {
      type: String,
      enum: ['unpaid', 'paid'],
      default: 'unpaid',
    },

    // Escrow Financial Model
    escrowAmount: {
      type: Number,
      default: 25000, // stored in paise (₹250.00)
    },
    escrowStatus: {
      type: String,
      enum: ['held', 'released_to_doctor', 'refunded_to_patient', 'penalty_split', 'disputed'],
      default: 'held',
    },
    escrowReleasedAt: { type: Date },

    // QR Check-in & Offline Bypass
    offlinePin: {
      type: String,
      default: function () {
        return Math.floor(100000 + Math.random() * 900000).toString();
      },
    },
    checkedInAt: { type: Date },
    checkInMethod: {
      type: String,
      enum: ['none', 'qr_scan', 'offline_pin', 'manual_bypass'],
      default: 'none',
    },
    manual_bypass: { type: Boolean, default: false },
    arrivalWindowStart: { type: Date },
    arrivalWindowEnd: { type: Date },

    // Consultation Details & Quality Control
    consultationStartedAt: { type: Date },
    consultationCompletedAt: { type: Date },
    consultationNotes: { type: String, default: '' },
    no_medication_required: { type: Boolean, default: false },

    // Dispute Lifecycle
    dispute: { type: disputeSchema, default: null },

    // Audit Trail System Logs
    systemLogs: [systemLogSchema],

    finalBillGenerated: {
      type: Boolean,
      default: false,
      comment: 'Flag to prevent duplicate bill generation',
    },
    prescriptionGenerated: {
      type: Boolean,
      default: false,
      comment: 'Flag to prevent duplicate prescription generation',
    },
  },
  { timestamps: true }
);

appointmentSchema.index({ doctorId: 1, date: 1, timeSlot: 1 }, { unique: true });
appointmentSchema.index({ status: 1 });
appointmentSchema.index({ escrowStatus: 1 });
appointmentSchema.index({ 'dispute.status': 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
