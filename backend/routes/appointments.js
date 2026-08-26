const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
  getQRToken,
  checkInWithQR,
  checkInWithOfflinePin,
  startConsultation,
  completeConsultation,
  reportDispute,
  doctorDisputeResponse,
  getAdminDisputes,
  resolveAdminDispute,
  cancelAppointmentWithPolicy,
} = require('../controllers/appointments');

const router = express.Router();

router.use(protect);

// QR & Check-in endpoints
router.get('/:id/qr-token', authorize('doctor', 'admin'), getQRToken);
router.post('/check-in', authorize('patient', 'doctor', 'admin'), checkInWithQR);
router.post('/offline-bypass', authorize('patient', 'doctor', 'admin'), checkInWithOfflinePin);

// Consultation lifecycle endpoints
router.post('/:id/start', authorize('doctor', 'admin'), startConsultation);
router.post('/:id/complete', authorize('doctor', 'admin'), completeConsultation);

// Dispute management endpoints
router.post('/:id/dispute', authorize('patient', 'admin'), reportDispute);
router.post('/:id/doctor-dispute-response', authorize('doctor', 'admin'), doctorDisputeResponse);

// Cancellation with 24h Escrow policy
router.post('/:id/cancel', cancelAppointmentWithPolicy);

// Admin dispute ledger endpoints
router.get('/admin/disputes', authorize('admin'), getAdminDisputes);
router.post('/admin/disputes/:id/resolve', authorize('admin'), resolveAdminDispute);

module.exports = router;
