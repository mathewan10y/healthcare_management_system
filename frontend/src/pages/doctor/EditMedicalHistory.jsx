import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiSave, FiArrowLeft, FiPlus, FiTrash2, FiAlertCircle, FiCheck } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../services/api';

const FormSection = ({ title, children }) => (
  <div className="bg-bg-card rounded-2xl border border-border-subtle p-6 shadow-card">
    <h3 className="text-lg font-bold text-text-primary mb-4">{title}</h3>
    {children}
  </div>
);

const SelectField = ({ label, value, onChange, options }) => (
  <div>
    <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-4 py-2.5 bg-bg-input text-text-primary border border-border-subtle rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value} className="bg-bg-card text-text-primary">{opt.label}</option>
      ))}
    </select>
  </div>
);

export default function EditMedicalHistory() {
  const navigate = useNavigate();
  const location = useLocation();
  const { patientId, patientName } = location.state || {};

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [medicalHistory, setMedicalHistory] = useState(null);
  const [formData, setFormData] = useState({
    bloodType: 'Unknown',
    height: '',
    weight: '',
    smokingStatus: 'unknown',
    alcoholConsumption: 'unknown',
    exerciseFrequency: 'unknown',
    allergies: [],
    pastConditions: [],
    currentMedications: [],
    surgeries: [],
    familyHistory: [],
    additionalNotes: ''
  });

  useEffect(() => {
    if (!patientId) {
      toast.error('Patient ID is required');
      navigate('/doctor/appointments');
      return;
    }
    loadMedicalHistory();
  }, [patientId]);

  const loadMedicalHistory = async () => {
    try {
      const response = await api.get(`/medical-history/patient/${patientId}`);
      const data = response.data.data;
      setMedicalHistory(data);
      
      setFormData({
        bloodType: data.bloodType || 'Unknown',
        height: data.height || '',
        weight: data.weight || '',
        smokingStatus: data.smokingStatus || 'unknown',
        alcoholConsumption: data.alcoholConsumption || 'unknown',
        exerciseFrequency: data.exerciseFrequency || 'unknown',
        allergies: data.allergies || [],
        pastConditions: data.pastConditions || [],
        currentMedications: data.currentMedications || [],
        surgeries: data.surgeries || [],
        familyHistory: data.familyHistory || [],
        additionalNotes: data.additionalNotes || ''
      });
    } catch (error) {
      console.error('Error loading medical history:', error);
      toast.error('Failed to load medical history');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const cleanArray = (arr) => arr.map(item => {
        const { _id, ...rest } = item;
        return rest;
      });

      const dataToSend = {
        ...formData,
        height: formData.height ? Number(formData.height) : null,
        weight: formData.weight ? Number(formData.weight) : null,
        allergies: cleanArray(formData.allergies),
        pastConditions: cleanArray(formData.pastConditions),
        currentMedications: cleanArray(formData.currentMedications),
        surgeries: cleanArray(formData.surgeries),
        familyHistory: cleanArray(formData.familyHistory)
      };
      
      await api.put(`/medical-history/patient/${patientId}`, dataToSend);
      toast.success('Medical history updated successfully!');
      loadMedicalHistory();
    } catch (error) {
      console.error('Save error:', error);
      toast.error(error?.response?.data?.message || 'Failed to update medical history');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    setApproving(true);
    try {
      await api.post(`/medical-history/patient/${patientId}/approve`);
      toast.success('Medical history approved successfully!');
      loadMedicalHistory();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to approve medical history');
    } finally {
      setApproving(false);
    }
  };

  // Array field handlers
  const addAllergy = () => {
    setFormData(prev => ({
      ...prev,
      allergies: [...prev.allergies, { _id: Date.now(), name: '', severity: 'moderate', reaction: '', diagnosedDate: '' }]
    }));
  };

  const removeAllergy = (index) => {
    setFormData(prev => ({
      ...prev,
      allergies: prev.allergies.filter((_, i) => i !== index)
    }));
  };

  const updateAllergy = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      allergies: prev.allergies.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const addCondition = () => {
    setFormData(prev => ({
      ...prev,
      pastConditions: [...prev.pastConditions, { _id: Date.now(), name: '', diagnosedDate: '', status: 'active', notes: '' }]
    }));
  };

  const removeCondition = (index) => {
    setFormData(prev => ({
      ...prev,
      pastConditions: prev.pastConditions.filter((_, i) => i !== index)
    }));
  };

  const updateCondition = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      pastConditions: prev.pastConditions.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const addMedication = () => {
    setFormData(prev => ({
      ...prev,
      currentMedications: [...prev.currentMedications, { _id: Date.now(), name: '', dosage: '', frequency: '', startDate: '', endDate: '', prescribedBy: '' }]
    }));
  };

  const removeMedication = (index) => {
    setFormData(prev => ({
      ...prev,
      currentMedications: prev.currentMedications.filter((_, i) => i !== index)
    }));
  };

  const updateMedication = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      currentMedications: prev.currentMedications.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const addSurgery = () => {
    setFormData(prev => ({
      ...prev,
      surgeries: [...prev.surgeries, { _id: Date.now(), name: '', date: '', hospital: '', notes: '' }]
    }));
  };

  const removeSurgery = (index) => {
    setFormData(prev => ({
      ...prev,
      surgeries: prev.surgeries.filter((_, i) => i !== index)
    }));
  };

  const updateSurgery = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      surgeries: prev.surgeries.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const addFamilyHistory = () => {
    setFormData(prev => ({
      ...prev,
      familyHistory: [...prev.familyHistory, { _id: Date.now(), condition: '', relationship: '', notes: '' }]
    }));
  };

  const removeFamilyHistory = (index) => {
    setFormData(prev => ({
      ...prev,
      familyHistory: prev.familyHistory.filter((_, i) => i !== index)
    }));
  };

  const updateFamilyHistory = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      familyHistory: prev.familyHistory.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading medical history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/doctor/appointments')}
            className="p-2 text-text-secondary hover:text-text-primary hover:bg-bg-card-hover rounded-xl border border-border-subtle transition-colors"
            aria-label="Back to appointments"
          >
            <FiArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-text-primary">Edit Medical History</h1>
            <p className="text-xs text-text-muted mt-0.5">Patient: <span className="font-semibold text-text-primary">{patientName || 'Unknown'}</span></p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving || approving}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-hover transition-colors font-semibold text-sm shadow-md disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              <>
                <FiSave className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
          <button
            onClick={handleApprove}
            disabled={saving || approving || medicalHistory?.approvalStatus === 'approved'}
            className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-colors font-semibold text-sm shadow-md disabled:opacity-50"
            title={medicalHistory?.approvalStatus === 'approved' ? 'Already approved' : 'Approve medical history'}
          >
            {approving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Approving...
              </>
            ) : (
              <>
                <FiCheck className="w-4 h-4" />
                Approve
              </>
            )}
          </button>
        </div>
      </div>

      {/* Approval Status Banner */}
      {medicalHistory?.approvalStatus === 'approved' && medicalHistory?.approvedBy && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <FiCheck className="w-5 h-5 text-green-500 mt-0.5" />
            <div>
              <p className="font-bold text-green-600 dark:text-green-400 text-sm">Medical History Approved</p>
              <p className="text-xs text-text-secondary mt-0.5">
                Approved by <span className="font-semibold text-text-primary">Dr. {medicalHistory.approvedBy.name}</span> on {new Date(medicalHistory.approvedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Correction Request Banner */}
      {medicalHistory?.correctionRequested && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <FiAlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
            <div>
              <p className="font-bold text-amber-600 dark:text-amber-400 text-sm">Patient Requested Correction</p>
              <p className="text-xs text-text-secondary mt-0.5">
                Requested on {new Date(medicalHistory.correctionRequestDate).toLocaleDateString()}
              </p>
              {medicalHistory.correctionRequestMessage && (
                <div className="mt-2 p-3 bg-bg-card rounded-xl border border-border-subtle">
                  <p className="text-xs font-semibold text-text-muted">Patient's Message:</p>
                  <p className="text-sm text-text-primary mt-1 italic">
                    "{medicalHistory.correctionRequestMessage}"
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Basic Information */}
      <FormSection title="Basic Information">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SelectField
            label="Blood Type"
            value={formData.bloodType}
            onChange={(value) => setFormData(prev => ({ ...prev, bloodType: value }))}
            options={[
              { value: 'Unknown', label: 'Unknown' },
              { value: 'A+', label: 'A+' },
              { value: 'A-', label: 'A-' },
              { value: 'B+', label: 'B+' },
              { value: 'B-', label: 'B-' },
              { value: 'AB+', label: 'AB+' },
              { value: 'AB-', label: 'AB-' },
              { value: 'O+', label: 'O+' },
              { value: 'O-', label: 'O-' }
            ]}
          />
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5">Height (cm)</label>
            <input
              type="number"
              value={formData.height}
              onChange={(e) => setFormData(prev => ({ ...prev, height: e.target.value }))}
              className="w-full px-4 py-2.5 bg-bg-input text-text-primary border border-border-subtle rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
              placeholder="170"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5">Weight (kg)</label>
            <input
              type="number"
              value={formData.weight}
              onChange={(e) => setFormData(prev => ({ ...prev, weight: e.target.value }))}
              className="w-full px-4 py-2.5 bg-bg-input text-text-primary border border-border-subtle rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
              placeholder="70"
            />
          </div>
        </div>
      </FormSection>

      {/* Lifestyle */}
      <FormSection title="Lifestyle Information">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SelectField
            label="Smoking Status"
            value={formData.smokingStatus}
            onChange={(value) => setFormData(prev => ({ ...prev, smokingStatus: value }))}
            options={[
              { value: 'unknown', label: 'Unknown' },
              { value: 'never', label: 'Never' },
              { value: 'former', label: 'Former' },
              { value: 'current', label: 'Current' }
            ]}
          />
          <SelectField
            label="Alcohol Consumption"
            value={formData.alcoholConsumption}
            onChange={(value) => setFormData(prev => ({ ...prev, alcoholConsumption: value }))}
            options={[
              { value: 'unknown', label: 'Unknown' },
              { value: 'none', label: 'None' },
              { value: 'occasional', label: 'Occasional' },
              { value: 'moderate', label: 'Moderate' },
              { value: 'heavy', label: 'Heavy' }
            ]}
          />
          <SelectField
            label="Exercise Frequency"
            value={formData.exerciseFrequency}
            onChange={(value) => setFormData(prev => ({ ...prev, exerciseFrequency: value }))}
            options={[
              { value: 'unknown', label: 'Unknown' },
              { value: 'none', label: 'None' },
              { value: 'rarely', label: 'Rarely' },
              { value: 'weekly', label: 'Weekly' },
              { value: 'daily', label: 'Daily' }
            ]}
          />
        </div>
      </FormSection>

      {/* Allergies */}
      <FormSection title="Allergies">
        <div className="space-y-3">
          {formData.allergies.map((allergy, index) => (
            <div key={allergy._id || `allergy-${index}`} className="flex gap-3 items-start p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
              <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                <input
                  type="text"
                  placeholder="Allergy name"
                  value={allergy.name}
                  onChange={(e) => updateAllergy(index, 'name', e.target.value)}
                  className="px-3 py-2 bg-bg-card text-text-primary border border-border-subtle rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                />
                <select
                  value={allergy.severity}
                  onChange={(e) => updateAllergy(index, 'severity', e.target.value)}
                  className="px-3 py-2 bg-bg-card text-text-primary border border-border-subtle rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                >
                  <option value="mild">Mild</option>
                  <option value="moderate">Moderate</option>
                  <option value="severe">Severe</option>
                </select>
                <input
                  type="text"
                  placeholder="Reaction"
                  value={allergy.reaction}
                  onChange={(e) => updateAllergy(index, 'reaction', e.target.value)}
                  className="px-3 py-2 bg-bg-card text-text-primary border border-border-subtle rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                />
                <input
                  type="date"
                  value={allergy.diagnosedDate ? new Date(allergy.diagnosedDate).toISOString().split('T')[0] : ''}
                  onChange={(e) => updateAllergy(index, 'diagnosedDate', e.target.value)}
                  className="px-3 py-2 bg-bg-card text-text-primary border border-border-subtle rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                />
              </div>
              <button
                onClick={() => removeAllergy(index)}
                className="p-2 text-red-500 hover:bg-red-500/20 rounded-xl transition-colors"
                aria-label="Remove allergy"
              >
                <FiTrash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
          <button
            onClick={addAllergy}
            className="flex items-center gap-2 px-4 py-2 text-primary border border-primary/30 rounded-xl hover:bg-primary/10 transition-colors font-semibold text-xs"
          >
            <FiPlus className="w-4 h-4" />
            Add Allergy
          </button>
        </div>
      </FormSection>

      {/* Past Conditions */}
      <FormSection title="Past Medical Conditions">
        <div className="space-y-3">
          {formData.pastConditions.map((condition, index) => (
            <div key={condition._id || `condition-${index}`} className="flex gap-3 items-start p-4 bg-bg-muted border border-border-subtle rounded-xl">
              <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                <input
                  type="text"
                  placeholder="Condition name"
                  value={condition.name}
                  onChange={(e) => updateCondition(index, 'name', e.target.value)}
                  className="px-3 py-2 bg-bg-card text-text-primary border border-border-subtle rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                />
                <input
                  type="date"
                  value={condition.diagnosedDate ? new Date(condition.diagnosedDate).toISOString().split('T')[0] : ''}
                  onChange={(e) => updateCondition(index, 'diagnosedDate', e.target.value)}
                  className="px-3 py-2 bg-bg-card text-text-primary border border-border-subtle rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                />
                <select
                  value={condition.status}
                  onChange={(e) => updateCondition(index, 'status', e.target.value)}
                  className="px-3 py-2 bg-bg-card text-text-primary border border-border-subtle rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                >
                  <option value="active">Active</option>
                  <option value="resolved">Resolved</option>
                  <option value="chronic">Chronic</option>
                </select>
                <input
                  type="text"
                  placeholder="Notes"
                  value={condition.notes}
                  onChange={(e) => updateCondition(index, 'notes', e.target.value)}
                  className="px-3 py-2 bg-bg-card text-text-primary border border-border-subtle rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                />
              </div>
              <button
                onClick={() => removeCondition(index)}
                className="p-2 text-red-500 hover:bg-red-500/20 rounded-xl transition-colors"
                aria-label="Remove condition"
              >
                <FiTrash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
          <button
            onClick={addCondition}
            className="flex items-center gap-2 px-4 py-2 text-primary border border-primary/30 rounded-xl hover:bg-primary/10 transition-colors font-semibold text-xs"
          >
            <FiPlus className="w-4 h-4" />
            Add Condition
          </button>
        </div>
      </FormSection>

      {/* Current Medications */}
      <FormSection title="Current Medications">
        <div className="space-y-3">
          {formData.currentMedications.map((medication, index) => (
            <div key={medication._id || `medication-${index}`} className="flex gap-3 items-start p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Medication name"
                  value={medication.name}
                  onChange={(e) => updateMedication(index, 'name', e.target.value)}
                  className="px-3 py-2 bg-bg-card text-text-primary border border-border-subtle rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                />
                <input
                  type="text"
                  placeholder="Dosage"
                  value={medication.dosage}
                  onChange={(e) => updateMedication(index, 'dosage', e.target.value)}
                  className="px-3 py-2 bg-bg-card text-text-primary border border-border-subtle rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                />
                <input
                  type="text"
                  placeholder="Frequency"
                  value={medication.frequency}
                  onChange={(e) => updateMedication(index, 'frequency', e.target.value)}
                  className="px-3 py-2 bg-bg-card text-text-primary border border-border-subtle rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                />
              </div>
              <button
                onClick={() => removeMedication(index)}
                className="p-2 text-red-500 hover:bg-red-500/20 rounded-xl transition-colors"
                aria-label="Remove medication"
              >
                <FiTrash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
          <button
            onClick={addMedication}
            className="flex items-center gap-2 px-4 py-2 text-primary border border-primary/30 rounded-xl hover:bg-primary/10 transition-colors font-semibold text-xs"
          >
            <FiPlus className="w-4 h-4" />
            Add Medication
          </button>
        </div>
      </FormSection>

      {/* Surgeries */}
      <FormSection title="Surgical History">
        <div className="space-y-3">
          {formData.surgeries.map((surgery, index) => (
            <div key={surgery._id || `surgery-${index}`} className="flex gap-3 items-start p-4 bg-bg-muted border border-border-subtle rounded-xl">
              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Surgery name"
                  value={surgery.name}
                  onChange={(e) => updateSurgery(index, 'name', e.target.value)}
                  className="px-3 py-2 bg-bg-card text-text-primary border border-border-subtle rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                />
                <input
                  type="date"
                  value={surgery.date ? new Date(surgery.date).toISOString().split('T')[0] : ''}
                  onChange={(e) => updateSurgery(index, 'date', e.target.value)}
                  className="px-3 py-2 bg-bg-card text-text-primary border border-border-subtle rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                />
                <input
                  type="text"
                  placeholder="Hospital"
                  value={surgery.hospital}
                  onChange={(e) => updateSurgery(index, 'hospital', e.target.value)}
                  className="px-3 py-2 bg-bg-card text-text-primary border border-border-subtle rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                />
              </div>
              <button
                onClick={() => removeSurgery(index)}
                className="p-2 text-red-500 hover:bg-red-500/20 rounded-xl transition-colors"
                aria-label="Remove surgery"
              >
                <FiTrash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
          <button
            onClick={addSurgery}
            className="flex items-center gap-2 px-4 py-2 text-primary border border-primary/30 rounded-xl hover:bg-primary/10 transition-colors font-semibold text-xs"
          >
            <FiPlus className="w-4 h-4" />
            Add Surgery
          </button>
        </div>
      </FormSection>

      {/* Family History */}
      <FormSection title="Family Medical History">
        <div className="space-y-3">
          {formData.familyHistory.map((item, index) => (
            <div key={item._id || `family-${index}`} className="flex gap-3 items-start p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Condition"
                  value={item.condition}
                  onChange={(e) => updateFamilyHistory(index, 'condition', e.target.value)}
                  className="px-3 py-2 bg-bg-card text-text-primary border border-border-subtle rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                />
                <input
                  type="text"
                  placeholder="Relationship"
                  value={item.relationship}
                  onChange={(e) => updateFamilyHistory(index, 'relationship', e.target.value)}
                  className="px-3 py-2 bg-bg-card text-text-primary border border-border-subtle rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                />
                <input
                  type="text"
                  placeholder="Notes"
                  value={item.notes}
                  onChange={(e) => updateFamilyHistory(index, 'notes', e.target.value)}
                  className="px-3 py-2 bg-bg-card text-text-primary border border-border-subtle rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                />
              </div>
              <button
                onClick={() => removeFamilyHistory(index)}
                className="p-2 text-red-500 hover:bg-red-500/20 rounded-xl transition-colors"
                aria-label="Remove family history item"
              >
                <FiTrash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
          <button
            onClick={addFamilyHistory}
            className="flex items-center gap-2 px-4 py-2 text-primary border border-primary/30 rounded-xl hover:bg-primary/10 transition-colors font-semibold text-xs"
          >
            <FiPlus className="w-4 h-4" />
            Add Family History
          </button>
        </div>
      </FormSection>

      {/* Additional Notes */}
      <FormSection title="Additional Notes">
        <textarea
          value={formData.additionalNotes}
          onChange={(e) => setFormData(prev => ({ ...prev, additionalNotes: e.target.value }))}
          placeholder="Any additional medical information..."
          rows={5}
          className="w-full px-4 py-2.5 bg-bg-input text-text-primary border border-border-subtle rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
        />
      </FormSection>
    </div>
  );
}
