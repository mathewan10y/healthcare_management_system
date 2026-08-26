import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiUser, FiCalendar, FiFileText, FiDollarSign, FiTag } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../services/api';

export default function ViewPrescription() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [prescription, setPrescription] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPrescription();
  }, [id]);

  const fetchPrescription = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/prescriptions/${id}`);
      setPrescription(response.data.data);
    } catch (error) {
      console.error('Error fetching prescription:', error);
      toast.error('Failed to load prescription');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!prescription) {
    return (
      <div className="text-center py-12 bg-bg-card rounded-2xl border border-border-subtle p-8">
        <p className="text-text-secondary mb-4">Prescription not found</p>
        <button
          onClick={() => navigate('/patient/prescriptions')}
          className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-hover transition-colors font-semibold text-sm"
        >
          Back to Prescriptions
        </button>
      </div>
    );
  }

  const prescribedOnlyMedicines = prescription.medicines?.filter(m => !m.purchaseFromHospital) || [];
  const billedMedicines = prescription.medicines?.filter(m => m.purchaseFromHospital) || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/patient/prescriptions')}
          className="p-2 text-text-secondary hover:text-text-primary hover:bg-bg-card-hover rounded-xl border border-border-subtle transition-colors"
          aria-label="Back to prescriptions"
        >
          <FiArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center justify-between w-full">
          <h1 className="text-3xl font-bold text-text-primary">Prescription Details</h1>
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border bg-primary-subtle text-primary border-primary-border">
            <FiTag className="w-3 h-3" /> {prescription.status || 'New'}
          </span>
        </div>
      </div>

      {/* Prescription Card */}
      <div className="bg-bg-card text-text-primary rounded-2xl shadow-card border border-border-subtle p-6 space-y-6">
        {/* Doctor & Appointment Info */}
        <div className="grid md:grid-cols-2 gap-4 pb-6 border-b border-border-subtle">
          <div className="flex items-start gap-3 p-4 bg-bg-muted rounded-xl border border-border-subtle">
            <div className="p-2.5 bg-blue-500/10 rounded-xl text-primary">
              <FiUser className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-text-muted uppercase tracking-wider">Prescribed By</div>
              <div className="font-bold text-text-primary text-base mt-0.5">{prescription.doctorId?.name || 'Doctor'}</div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-bg-muted rounded-xl border border-border-subtle">
            <div className="p-2.5 bg-green-500/10 rounded-xl text-green-500">
              <FiCalendar className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-text-muted uppercase tracking-wider">Appointment</div>
              <div className="font-bold text-text-primary text-base mt-0.5">
                {prescription.appointmentId?.date ? new Date(prescription.appointmentId.date).toLocaleDateString() : 'N/A'}
              </div>
              {prescription.appointmentId?.timeSlot && (
                <div className="text-xs text-text-secondary mt-0.5">{prescription.appointmentId.timeSlot}</div>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-bg-muted rounded-xl border border-border-subtle">
            <div className="p-2.5 bg-purple-500/10 rounded-xl text-purple-500">
              <FiFileText className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-text-muted uppercase tracking-wider">Date Issued</div>
              <div className="font-bold text-text-primary text-base mt-0.5">
                {new Date(prescription.dateIssued).toLocaleDateString()}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-bg-muted rounded-xl border border-border-subtle">
            <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-500">
              <FiDollarSign className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-text-muted uppercase tracking-wider">Doctor Fee</div>
              <div className="font-bold text-text-primary text-base mt-0.5">
                ₹{((prescription.consultationFee || 0) / 100).toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* Prescribed-Only Medicines */}
        {(prescribedOnlyMedicines.length > 0 || billedMedicines.length > 0) && (
          <div>
            <h3 className="font-bold text-text-primary text-base mb-3">Prescribed Medicines{billedMedicines.length === 0 ? ' (Not Billed)' : ''}</h3>
            <div className="space-y-3">
              {(prescribedOnlyMedicines.length > 0 ? prescribedOnlyMedicines : billedMedicines).map((med, index) => (
                <div key={index} className="bg-bg-muted border border-border-subtle rounded-xl p-4">
                  <div className="font-bold text-text-primary text-sm mb-2">{med.medicineName}</div>
                  <div className="grid sm:grid-cols-3 gap-2 text-xs">
                    <div className="p-2 bg-bg-card rounded-lg border border-border-subtle">
                      <span className="text-text-muted block mb-0.5">Dosage</span> <span className="font-medium text-text-primary">{med.dosage || '-'}</span>
                    </div>
                    <div className="p-2 bg-bg-card rounded-lg border border-border-subtle">
                      <span className="text-text-muted block mb-0.5">Frequency</span> <span className="font-medium text-text-primary">{med.frequency || '-'}</span>
                    </div>
                    <div className="p-2 bg-bg-card rounded-lg border border-border-subtle">
                      <span className="text-text-muted block mb-0.5">Duration</span> <span className="font-medium text-text-primary">{med.duration || '-'}</span>
                    </div>
                  </div>
                  {med.instructions && (
                    <div className="mt-3 text-xs text-text-secondary p-2 bg-bg-card rounded-lg border border-border-subtle">
                      <span className="font-semibold text-text-primary">Instructions:</span> {med.instructions}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Billed Medicines */}
        {billedMedicines.length > 0 && prescribedOnlyMedicines.length > 0 && (
          <div>
            <h3 className="font-bold text-text-primary text-base mb-3">Hospital-Billed Medicines</h3>
            <div className="space-y-3">
              {billedMedicines.map((med, index) => (
                <div key={index} className="bg-bg-muted border border-border-subtle rounded-xl p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-bold text-text-primary text-sm">{med.medicineName}</div>
                    <span className="text-xs bg-green-500/10 text-green-600 dark:text-green-400 font-semibold px-2.5 py-0.5 rounded-full border border-green-500/20">
                      Billed
                    </span>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-2 text-xs">
                    <div className="p-2 bg-bg-card rounded-lg border border-border-subtle">
                      <span className="text-text-muted block mb-0.5">Dosage</span> <span className="font-medium text-text-primary">{med.dosage || '-'}</span>
                    </div>
                    <div className="p-2 bg-bg-card rounded-lg border border-border-subtle">
                      <span className="text-text-muted block mb-0.5">Frequency</span> <span className="font-medium text-text-primary">{med.frequency || '-'}</span>
                    </div>
                    <div className="p-2 bg-bg-card rounded-lg border border-border-subtle">
                      <span className="text-text-muted block mb-0.5">Duration</span> <span className="font-medium text-text-primary">{med.duration || '-'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
