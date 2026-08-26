const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { 
  getDoctorProfile, 
  updateDoctorProfile, 
  getDoctorAppointments, 
  updateAppointment, 
  updateAvailability, 
  createPrescription, 
  getDoctorPrescriptions,
  getPrescriptionById,
  getBillById,
  submitKyc, 
  getAvailableSlots, 
  getAvailableDates,
  markAppointmentMissed,
  rejectAppointment,
  rescheduleAppointment,
  scheduleFollowUp
} = require('../controllers/doctors');

const {
  getDoctors,
  searchPatients,
  getPatientFile,
} = require('../controllers/patients');

const router = express.Router();

// Public routes for doctor discovery and appointment slots
router.get('/', getDoctors);
router.get('/:id/available-slots', getAvailableSlots);
router.get('/:id/slots', getAvailableSlots);
router.get('/:id/available-dates', getAvailableDates);
router.get('/:id/dates', getAvailableDates);

// Protected routes for doctors only
router.use(protect);
router.use(authorize('doctor', 'admin'));

router.get('/profile', getDoctorProfile);
router.put('/profile', updateDoctorProfile);
router.get('/appointments', getDoctorAppointments);
router.put('/appointments/:id', updateAppointment);
router.post('/appointments/:id/mark-missed', markAppointmentMissed);
router.post('/appointments/:id/reject', rejectAppointment);
router.put('/appointments/:id/reschedule', rescheduleAppointment);
router.post('/appointments/:id/follow-up', scheduleFollowUp);
router.put('/availability', updateAvailability);
router.post('/prescriptions', createPrescription);
router.get('/prescriptions', getDoctorPrescriptions);
router.get('/prescriptions/:id', getPrescriptionById);
router.get('/bills/:id', getBillById);
router.post('/me/kyc', submitKyc);

// Patient search and file access for doctors
router.get('/patients/search', searchPatients);
router.get('/patient-file/:patientId', getPatientFile);

module.exports = router;
