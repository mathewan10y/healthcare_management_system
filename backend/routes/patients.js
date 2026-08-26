const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
  getDoctors,
  getAvailableSlots,
  bookAppointment,
  getAppointments,
  getPrescriptions,
  getPrescriptionById,
  getRefillQuote,
  createRefillBill,
  rateAppointment,
  cancelAppointment,
  getPatientFile,
  searchPatients,
} = require('../controllers/patients');

const { getAvailableDates } = require('../controllers/doctors');

const router = express.Router();

router.use(protect);

// Patient-only routes
router.get('/doctors', authorize('patient'), getDoctors);
router.get('/doctors/:doctorId/available-slots', authorize('patient'), getAvailableSlots);
router.get('/doctors/:doctorId/slots', authorize('patient'), getAvailableSlots);
router.get('/doctors/:doctorId/available-dates', authorize('patient'), getAvailableDates);
router.get('/doctors/:doctorId/dates', authorize('patient'), getAvailableDates);

router.post('/book-with-payment', authorize('patient'), bookAppointment);
router.route('/appointments').get(authorize('patient'), getAppointments).post(authorize('patient'), bookAppointment);
router.post('/appointments/:id/cancel', authorize('patient'), cancelAppointment);
router.post('/appointments/:appointmentId/rate', authorize('patient'), rateAppointment);
router.get('/prescriptions', authorize('patient'), getPrescriptions);
router.get('/prescriptions/:id', authorize('patient'), getPrescriptionById);
router.post('/refill/quote', authorize('patient'), getRefillQuote);
router.post('/refill', authorize('patient'), createRefillBill);

// Doctor routes for patient file access
router.get('/search', authorize('doctor', 'admin'), searchPatients);
router.get('/:patientId/file', authorize('doctor', 'admin'), getPatientFile);

module.exports = router;
