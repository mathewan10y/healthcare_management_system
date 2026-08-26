import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiSearch, FiUser, FiCalendar, FiFileText, FiDollarSign, 
  FiHeart, FiAlertCircle, FiCheckCircle
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../services/api';

export default function PatientFile() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientFile, setPatientFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const searchPatients = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a patient name or email to search');
      return;
    }

    setSearching(true);
    try {
      let response;
      try {
        response = await api.get(`/doctors/patients/search?query=${encodeURIComponent(searchQuery.trim())}`);
      } catch {
        response = await api.get(`/patients/search?query=${encodeURIComponent(searchQuery.trim())}`);
      }
      setSearchResults(response.data.data || []);
      if (!response.data.data || response.data.data.length === 0) {
        toast.info('No patients found matching your query');
      }
    } catch (error) {
      console.error('Error searching patients:', error);
      toast.error(error.response?.data?.message || 'Failed to search patients');
    } finally {
      setSearching(false);
    }
  };

  const loadPatientFile = async (patientId) => {
    setLoading(true);
    try {
      let response;
      try {
        response = await api.get(`/doctors/patient-file/${patientId}`);
      } catch {
        response = await api.get(`/patients/${patientId}/file`);
      }
      setPatientFile(response.data.data);
      const patient = searchResults.find(p => p._id === patientId);
      setSelectedPatient(patient);
    } catch (error) {
      console.error('Error loading patient file:', error);
      toast.error(error.response?.data?.message || 'Failed to load patient file');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return `₹${((amount || 0) / 100).toFixed(2)}`;
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'paid':
        return 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20';
      case 'scheduled':
      case 'pending':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20';
      case 'unpaid':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20';
      case 'cancelled':
        return 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20';
      default:
        return 'bg-bg-card-hover text-text-secondary border border-border-subtle';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <h1 className="text-3xl font-bold text-text-primary flex items-center">
        <FiFileText className="mr-3 text-primary" />
        Patient File Viewer
      </h1>

      {/* Search Section */}
      <div className="bg-bg-card p-6 rounded-2xl shadow-card border border-border-subtle mb-6">
        <h2 className="text-lg font-bold mb-4 text-text-primary">Search Patient</h2>
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchPatients()}
              placeholder="Search by patient name or email..."
              className="w-full bg-bg-input text-text-primary border border-border-subtle rounded-xl h-12 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
            />
          </div>
          <button
            onClick={searchPatients}
            disabled={searching}
            className="px-6 bg-primary text-white font-semibold rounded-xl hover:bg-primary-hover transition-all disabled:opacity-50 text-sm shadow-md"
          >
            {searching ? 'Searching...' : 'Search'}
          </button>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mt-4 border border-border-subtle rounded-xl divide-y divide-border-subtle bg-bg-card overflow-hidden">
            {searchResults.map((patient) => (
              <button
                key={patient._id}
                onClick={() => loadPatientFile(patient._id)}
                className="w-full p-4 hover:bg-bg-card-hover text-left transition-colors flex items-center justify-between"
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mr-3 text-primary">
                    <FiUser className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-text-primary text-sm">{patient.name}</div>
                    <div className="text-xs text-text-secondary">{patient.email}</div>
                  </div>
                </div>
                <div className="text-xs text-text-muted font-medium">{patient.district || 'Kerala'}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-text-secondary">Loading patient file...</p>
        </div>
      )}

      {/* Patient File */}
      {!loading && patientFile && (
        <div className="space-y-6">
          {/* Patient Header */}
          <div className="bg-gradient-to-br from-primary/15 to-primary/5 p-6 rounded-2xl border border-primary/20 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex items-center">
                <div className="w-16 h-16 bg-primary/20 text-primary rounded-2xl flex items-center justify-center mr-4 shadow-sm">
                  <FiUser className="text-3xl" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-text-primary">{patientFile.patient.name}</h2>
                  <p className="text-text-secondary text-sm">{patientFile.patient.email}</p>
                  <p className="text-xs text-text-muted mt-1">
                    District: {patientFile.patient.district || 'Not specified'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setPatientFile(null);
                  setSelectedPatient(null);
                }}
                className="text-xs font-semibold text-text-muted hover:text-text-primary px-3 py-1.5 rounded-lg hover:bg-bg-card-hover transition-colors"
              >
                Close
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-bg-card p-5 rounded-2xl shadow-card border border-border-subtle">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Total Appointments</p>
                  <p className="text-2xl font-bold text-text-primary">{patientFile.appointments.total}</p>
                </div>
                <div className="p-3 bg-blue-500/10 text-primary rounded-xl">
                  <FiCalendar className="w-6 h-6" />
                </div>
              </div>
            </div>
            <div className="bg-bg-card p-5 rounded-2xl shadow-card border border-border-subtle">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Completed</p>
                  <p className="text-2xl font-bold text-green-500">{patientFile.appointments.completed}</p>
                </div>
                <div className="p-3 bg-green-500/10 text-green-500 rounded-xl">
                  <FiCheckCircle className="w-6 h-6" />
                </div>
              </div>
            </div>
            <div className="bg-bg-card p-5 rounded-2xl shadow-card border border-border-subtle">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Prescriptions</p>
                  <p className="text-2xl font-bold text-text-primary">{patientFile.prescriptions.total}</p>
                </div>
                <div className="p-3 bg-purple-500/10 text-purple-500 rounded-xl">
                  <FiFileText className="w-6 h-6" />
                </div>
              </div>
            </div>
            <div className="bg-bg-card p-5 rounded-2xl shadow-card border border-border-subtle">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Unpaid Bills</p>
                  <p className="text-2xl font-bold text-amber-500">{patientFile.bills.unpaid}</p>
                </div>
                <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
                  <FiDollarSign className="w-6 h-6" />
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-bg-card rounded-2xl shadow-card border border-border-subtle overflow-hidden">
            <div className="border-b border-border-subtle bg-bg-muted px-4">
              <div className="flex overflow-x-auto gap-2">
                {[
                  { id: 'overview', label: 'Overview', icon: FiHeart },
                  { id: 'appointments', label: 'Appointments', icon: FiCalendar },
                  { id: 'prescriptions', label: 'Prescriptions', icon: FiFileText },
                  { id: 'bills', label: 'Bills', icon: FiDollarSign },
                  { id: 'medicalHistory', label: 'Medical History', icon: FiHeart }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center px-5 py-4 font-semibold text-sm transition-colors border-b-2 whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-primary text-primary bg-bg-card'
                        : 'border-transparent text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <tab.icon className="mr-2 w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6">
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Medical History Summary */}
                  <div>
                    <h3 className="text-lg font-bold text-text-primary mb-3">Medical History</h3>
                    
                    {patientFile.medicalHistory?.correctionRequested && (
                      <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl mb-4">
                        <div className="flex items-start">
                          <FiAlertCircle className="text-amber-500 mt-0.5 mr-3 flex-shrink-0" />
                          <div>
                            <p className="font-semibold text-amber-600 dark:text-amber-400">⚠️ Correction Requested</p>
                            <p className="text-xs text-text-secondary mt-1">
                              Patient requested correction on {new Date(patientFile.medicalHistory.correctionRequestDate).toLocaleDateString()}
                            </p>
                            {patientFile.medicalHistory.correctionRequestMessage && (
                              <p className="text-sm text-text-primary mt-2 italic bg-bg-card p-3 rounded-lg border border-border-subtle">
                                "{patientFile.medicalHistory.correctionRequestMessage}"
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {patientFile.medicalHistory ? (
                      <div className="bg-bg-muted p-5 rounded-xl border border-border-subtle space-y-3">
                        <div className="grid sm:grid-cols-3 gap-4">
                          <div>
                            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-1">Blood Type</span>
                            <span className="text-base font-bold text-text-primary">{patientFile.medicalHistory.bloodType || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-1">Height</span>
                            <span className="text-base font-bold text-text-primary">
                              {patientFile.medicalHistory.height ? `${patientFile.medicalHistory.height} cm` : 'Not specified'}
                            </span>
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-1">Weight</span>
                            <span className="text-base font-bold text-text-primary">
                              {patientFile.medicalHistory.weight ? `${patientFile.medicalHistory.weight} kg` : 'Not specified'}
                            </span>
                          </div>
                        </div>
                        {patientFile.medicalHistory.allergies && patientFile.medicalHistory.allergies.length > 0 && (
                          <div className="pt-2">
                            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-2">Allergies</span>
                            <div className="flex flex-wrap gap-2">
                              {patientFile.medicalHistory.allergies.map((allergy, idx) => (
                                <span key={idx} className="px-3 py-1 bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 text-xs font-medium rounded-lg">
                                  {allergy.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-text-secondary text-sm">No medical history available</p>
                    )}
                  </div>

                  {/* Quick Summary */}
                  <div>
                    <h3 className="text-lg font-bold text-text-primary mb-3">Summary</h3>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="bg-primary/10 border border-primary/20 p-5 rounded-xl">
                        <p className="text-xs font-semibold text-primary uppercase tracking-wider">Upcoming Appointments</p>
                        <p className="text-2xl font-bold text-text-primary mt-1">{patientFile.appointments.upcoming}</p>
                      </div>
                      <div className="bg-amber-500/10 border border-amber-500/20 p-5 rounded-xl">
                        <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Total Unpaid Amount</p>
                        <p className="text-2xl font-bold text-text-primary mt-1">
                          {formatCurrency(patientFile.bills.totalUnpaidAmount)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Appointments Tab */}
              {activeTab === 'appointments' && (
                <div className="space-y-3">
                  {patientFile.appointments.data.length > 0 ? (
                    patientFile.appointments.data.map((appt) => (
                      <div key={appt._id} className="border border-border-subtle bg-bg-muted rounded-xl p-4 hover:shadow-sm transition-shadow">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2 mb-1.5">
                              <FiCalendar className="text-primary" />
                              <span className="font-semibold text-text-primary">{formatDate(appt.date)}</span>
                              <span className="text-text-muted">•</span>
                              <span className="text-text-secondary text-sm">{appt.timeSlot}</span>
                            </div>
                            <div className="text-xs text-text-secondary">
                              Doctor: <span className="font-medium text-text-primary">{appt.doctorId?.name || 'Unknown'}</span>
                            </div>
                            {appt.notes && (
                              <div className="text-xs text-text-muted mt-1">
                                Notes: {appt.notes}
                              </div>
                            )}
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(appt.status)}`}>
                            {appt.status}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-text-muted py-8 text-sm">No appointments found</p>
                  )}
                </div>
              )}

              {/* Prescriptions Tab */}
              {activeTab === 'prescriptions' && (
                <div className="space-y-3">
                  {patientFile.prescriptions.data.length > 0 ? (
                    patientFile.prescriptions.data.map((pres) => (
                      <div key={pres._id} className="border border-border-subtle bg-bg-muted rounded-xl p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-bold text-text-primary">
                              {formatDate(pres.dateIssued)}
                            </div>
                            <div className="text-xs text-text-secondary mt-0.5">
                              Dr. {pres.doctorId?.name || 'Unknown'}
                            </div>
                          </div>
                          {pres.consultationFee > 0 && (
                            <div className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                              Fee: {formatCurrency(pres.consultationFee)}
                            </div>
                          )}
                        </div>
                        {pres.diagnosis && (
                          <div className="text-xs">
                            <span className="font-semibold text-text-secondary">Diagnosis:</span>{' '}
                            <span className="text-text-primary">{pres.diagnosis}</span>
                          </div>
                        )}
                        {pres.medicines && pres.medicines.length > 0 && (
                          <div>
                            <span className="text-xs font-semibold text-text-secondary">Medicines:</span>
                            <div className="mt-2 space-y-2">
                              {pres.medicines.map((med, idx) => (
                                <div key={idx} className="bg-bg-card p-3 rounded-lg border border-border-subtle text-xs">
                                  <div className="font-bold text-text-primary">{med.medicineName}</div>
                                  <div className="text-text-secondary mt-0.5">
                                    {med.dosage} • {med.frequency} • {med.duration}
                                  </div>
                                  {med.instructions && (
                                    <div className="text-text-muted text-[11px] mt-1">
                                      {med.instructions}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-text-muted py-8 text-sm">No prescriptions found</p>
                  )}
                </div>
              )}

              {/* Bills Tab */}
              {activeTab === 'bills' && (
                <div className="space-y-3">
                  {patientFile.bills.data.length > 0 ? (
                    patientFile.bills.data.map((bill) => (
                      <div key={bill._id} className="border border-border-subtle bg-bg-muted rounded-xl p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="font-bold text-text-primary text-sm">
                              Bill #{bill._id.slice(-6)}
                            </div>
                            <div className="text-xs text-text-muted">
                              {formatDate(bill.createdAt)}
                            </div>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(bill.status)}`}>
                            {bill.status}
                          </span>
                        </div>
                        <div className="space-y-1.5 mb-3">
                          {bill.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-xs">
                              <span className="text-text-secondary">
                                {item.description} × {item.quantity}
                              </span>
                              <span className="text-text-primary font-medium">
                                {formatCurrency(item.amount * item.quantity)}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="border-t border-border-subtle pt-2 flex justify-between font-bold text-sm">
                          <span className="text-text-primary">Total</span>
                          <span className="text-primary">{formatCurrency(bill.totalAmount)}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-text-muted py-8 text-sm">No bills found</p>
                  )}
                </div>
              )}

              {/* Medical History Tab */}
              {activeTab === 'medicalHistory' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-text-primary">Complete Medical History</h3>
                    <button
                      onClick={() => navigate('/doctor/edit-medical-history', {
                        state: { patientId: selectedPatient._id, patientName: selectedPatient.name }
                      })}
                      className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-hover transition-colors font-semibold text-xs shadow-sm"
                    >
                      Edit Medical History
                    </button>
                  </div>
                  
                  {patientFile.medicalHistory ? (
                    <div className="space-y-4">
                      {/* Basic Info */}
                      <div className="bg-bg-muted p-4 rounded-xl border border-border-subtle">
                        <h4 className="font-bold text-text-primary mb-3 text-sm">Basic Information</h4>
                        <div className="grid sm:grid-cols-3 gap-4">
                          <div>
                            <span className="text-xs text-text-muted">Blood Type:</span>
                            <p className="font-bold text-text-primary text-sm mt-0.5">{patientFile.medicalHistory.bloodType || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-xs text-text-muted">Height:</span>
                            <p className="font-bold text-text-primary text-sm mt-0.5">
                              {patientFile.medicalHistory.height ? `${patientFile.medicalHistory.height} cm` : 'Not specified'}
                            </p>
                          </div>
                          <div>
                            <span className="text-xs text-text-muted">Weight:</span>
                            <p className="font-bold text-text-primary text-sm mt-0.5">
                              {patientFile.medicalHistory.weight ? `${patientFile.medicalHistory.weight} kg` : 'Not specified'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Allergies */}
                      {patientFile.medicalHistory.allergies && patientFile.medicalHistory.allergies.length > 0 && (
                        <div className="bg-red-500/10 p-4 rounded-xl border border-red-500/20">
                          <h4 className="font-bold mb-3 text-red-600 dark:text-red-400 text-sm">Allergies</h4>
                          <div className="space-y-2">
                            {patientFile.medicalHistory.allergies.map((allergy, idx) => (
                              <div key={idx} className="bg-bg-card p-3 rounded-lg border border-border-subtle">
                                <div className="flex justify-between items-center">
                                  <span className="font-bold text-text-primary text-sm">{allergy.name}</span>
                                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/20 text-red-600 dark:text-red-400">
                                    {allergy.severity}
                                  </span>
                                </div>
                                {allergy.reaction && (
                                  <p className="text-xs text-text-secondary mt-1">Reaction: {allergy.reaction}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <FiHeart className="mx-auto text-6xl text-text-muted/30 mb-4" />
                      <p className="text-text-muted mb-4 text-sm">No medical history available</p>
                      <button
                        onClick={() => navigate('/doctor/edit-medical-history', {
                          state: { patientId: selectedPatient._id, patientName: selectedPatient.name }
                        })}
                        className="px-5 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-hover transition-colors font-semibold text-xs shadow-md"
                      >
                        Create Medical History
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !patientFile && searchResults.length === 0 && (
        <div className="text-center py-16 bg-bg-card rounded-2xl border border-border-subtle p-8">
          <FiSearch className="mx-auto text-5xl text-text-muted/30 mb-3" />
          <p className="text-text-secondary text-sm">Search for a patient by name or email to view their complete medical file</p>
        </div>
      )}
    </div>
  );
}
