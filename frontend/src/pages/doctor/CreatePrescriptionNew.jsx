import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { 
  FiFileText, 
  FiUser, 
  FiPlus, 
  FiTrash2, 
  FiCalendar, 
  FiSearch,
  FiShoppingCart,
  FiEdit,
  FiPackage,
  FiAlertCircle
} from 'react-icons/fi';
import { AppSelect } from '../../components/ui';

export default function CreatePrescriptionNew() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // State
  const [appointments, setAppointments] = useState([]);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Prescription data
  const [billedMedicines, setBilledMedicines] = useState([]);
  const [prescribedOnlyMedicines, setPrescribedOnlyMedicines] = useState([]);
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  // Doctor fee is prepaid at appointment booking; no manual entry here
  
  // Inventory search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  useEffect(() => {
    fetchAppointments();
  }, [location.state]);

  const fetchAppointments = async () => {
    try {
      const res = await api.get('/doctors/appointments');
      const eligibleAppts = (res.data.data || []).filter(
        a => a.status === 'Completed' && !a.prescriptionGenerated
      );
      setAppointments(eligibleAppts);

      // Pre-select if navigated from another page
      const apptIdFromState = location.state?.appointmentId;
      if (apptIdFromState) {
        const preselect = eligibleAppts.find(a => a._id === apptIdFromState);
        if (preselect) setSelectedAppointment(preselect);
      }
    } catch (e) {
      toast.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  // Search inventory
  const searchInventory = async (query) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setSearching(true);
    try {
      const res = await api.get(`/inventory/search?query=${encodeURIComponent(query)}`);
      setSearchResults(res.data.medicines || []);
      setShowSearchResults(true);
    } catch (e) {
      console.error('Search error:', e);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchInventory(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Add medicine from inventory to billed items
  const addBilledMedicine = (inventoryItem) => {
    const newMedicine = {
      medicineName: inventoryItem.medicineName,
      dosage: '',
      frequency: '',
      duration: '',
      instructions: '',
      quantity: 1,
      price: inventoryItem.price,
      stockQuantity: inventoryItem.stockQuantity,
      unit: inventoryItem.unit
    };
    setBilledMedicines([...billedMedicines, newMedicine]);
    setSearchQuery('');
    setShowSearchResults(false);
    toast.success(`${inventoryItem.medicineName} added to billed items`);
  };

  // Update billed medicine
  const updateBilledMedicine = (index, field, value) => {
    const updated = [...billedMedicines];
    updated[index][field] = value;
    setBilledMedicines(updated);
  };

  // Remove billed medicine
  const removeBilledMedicine = (index) => {
    setBilledMedicines(billedMedicines.filter((_, i) => i !== index));
  };

  // Add prescribed-only medicine
  const addPrescribedOnly = () => {
    setPrescribedOnlyMedicines([
      ...prescribedOnlyMedicines,
      {
        medicineName: '',
        dosage: '',
        frequency: '',
        duration: '',
        instructions: '',
        quantity: 1
      }
    ]);
  };

  // Update prescribed-only medicine
  const updatePrescribedOnly = (index, field, value) => {
    const updated = [...prescribedOnlyMedicines];
    updated[index][field] = value;
    setPrescribedOnlyMedicines(updated);
  };

  // Remove prescribed-only medicine
  const removePrescribedOnly = (index) => {
    setPrescribedOnlyMedicines(prescribedOnlyMedicines.filter((_, i) => i !== index));
  };

  // Calculate total
  const calculateTotal = () => {
    // Total is only medicines; consultation fee is prepaid at booking
    return billedMedicines.reduce((sum, med) => {
      return sum + (med.price * med.quantity);
    }, 0);
  };

  // Submit prescription
  const onSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedAppointment) {
      toast.error('Please select an appointment');
      return;
    }

    // Validate billed medicines
    const validBilledMeds = billedMedicines.filter(m => 
      m.medicineName && m.dosage && m.frequency && m.duration && m.quantity > 0
    );

    // Validate prescribed-only medicines
    const validPrescribedOnly = prescribedOnlyMedicines.filter(m => 
      m.medicineName && m.dosage && m.frequency && m.duration
    );

    if (validBilledMeds.length === 0 && validPrescribedOnly.length === 0) {
      toast.error('Please add at least one medicine');
      return;
    }

    setSaving(true);
    const loadingToast = toast.loading('Creating prescription and generating bill...');

    try {
      const payload = {
        appointmentId: selectedAppointment._id,
        billedMedicines: validBilledMeds,
        prescribedOnlyMedicines: validPrescribedOnly,
        diagnosis,
        notes,
        generateBill: validBilledMeds.length > 0
      };

      const res = await api.post('/doctors/prescriptions', payload);
      
      toast.dismiss(loadingToast);
      
      console.log('Prescription response:', res.data);
      
      if (res.data.data.billGenerated && res.data.data.bill) {
        toast.success('Prescription created and bill generated successfully!');
        console.log('Redirecting to bill:', res.data.data.bill._id);
        // Redirect to bill view
        navigate(`/doctor/bills/${res.data.data.bill._id}`);
      } else {
        toast.success('Prescription created successfully! No bill generated.');
        console.log('No bill generated, redirecting to appointments');
        navigate('/doctor/appointments');
      }
    } catch (e) {
      toast.dismiss(loadingToast);
      toast.error(e.response?.data?.message || 'Failed to create prescription');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center p-6">Loading appointments...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-text-primary mb-6 flex items-center">
        <FiFileText className="mr-3 text-primary" />
        Create Smart Prescription
      </h1>

      {/* Appointment Selection */}
      <div className="bg-white dark:bg-bg-card-dark p-6 rounded-xl shadow-card dark:shadow-card-dark mb-6">
        <AppSelect
          label="Select Completed Appointment"
          placeholder="-- Select an appointment --"
          value={selectedAppointment?._id || ''}
          onChange={(value) => setSelectedAppointment(appointments.find(a => a._id === value))}
          options={appointments.map(a => ({
            value: a._id,
            label: `${new Date(a.date).toLocaleDateString()} - ${a.timeSlot} - ${a.patientId?.name}`
          }))}
          icon={FiCalendar}
          searchable
          searchPlaceholder="Search appointments..."
        />
        
        {appointments.length === 0 && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start">
            <FiAlertCircle className="text-yellow-600 mt-1 mr-3 flex-shrink-0" />
            <div className="text-sm text-yellow-800">
              No eligible appointments found. Only completed appointments without prescriptions can be selected.
            </div>
          </div>
        )}
      </div>

      {selectedAppointment && (
        <form onSubmit={onSubmit} className="space-y-6">
          {/* Patient Details */}
          <div className="bg-white dark:bg-bg-card-dark p-6 rounded-xl shadow-card dark:shadow-card-dark">
            <h3 className="font-semibold text-lg flex items-center mb-4">
              <FiUser className="mr-2 text-primary" /> Patient Details
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-text-secondary">Name:</span>{' '}
                <span className="text-text-primary">{selectedAppointment.patientId?.name}</span>
              </div>
              <div>
                <span className="font-medium text-text-secondary">Email:</span>{' '}
                <span className="text-text-primary">{selectedAppointment.patientId?.email}</span>
              </div>
              <div>
                <span className="font-medium text-text-secondary">Date:</span>{' '}
                <span className="text-text-primary">
                  {new Date(selectedAppointment.date).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="font-medium text-text-secondary">Time:</span>{' '}
                <span className="text-text-primary">{selectedAppointment.timeSlot}</span>
              </div>
            </div>
          </div>

          {/* Diagnosis & Notes */}
          <div className="bg-bg-card p-6 rounded-2xl shadow-card border border-border-subtle space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Diagnosis
              </label>
              <input
                type="text"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="Enter diagnosis"
                className="w-full bg-bg-page border border-slate-300/70 rounded-lg h-12 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Additional Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes or instructions"
                rows={3}
                className="w-full bg-bg-page border border-slate-300/70 rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          {/* Billed Items Section */}
          <div className="bg-white dark:bg-bg-card-dark p-6 rounded-xl shadow-card dark:shadow-card-dark">
            <h3 className="font-semibold text-lg flex items-center mb-4">
              <FiShoppingCart className="mr-2 text-primary" /> 
              Billed Items (From Hospital Inventory)
            </h3>

            {/* Inventory Search */}
            <div className="mb-6 relative">
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Search Hospital Inventory
              </label>
              <div className="relative">
                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchQuery && setShowSearchResults(true)}
                  placeholder="Type medicine name to search..."
                  className="w-full bg-bg-page border border-slate-300/70 rounded-lg h-12 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                {searching && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
                  </div>
                )}
              </div>

              {/* Search Results Dropdown */}
              {showSearchResults && searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-2 bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                  {searchResults.map((item) => (
                    <button
                      key={item._id}
                      type="button"
                      onClick={() => addBilledMedicine(item)}
                      className="w-full p-4 hover:bg-slate-50 text-left border-b last:border-b-0 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-text-primary">{item.medicineName}</div>
                          {item.genericName && (
                            <div className="text-sm text-text-secondary">{item.genericName}</div>
                          )}
                          <div className="text-sm text-text-secondary mt-1">
                            ₹{(item.price / 100).toFixed(2)} per {item.unit}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-medium ${
                            item.stockQuantity > 10 ? 'text-green-600' : 'text-orange-600'
                          }`}>
                            {item.stockQuantity > 0 ? 'In Stock' : 'Out of Stock'}
                          </div>
                          <div className="text-xs text-text-secondary">
                            {item.stockQuantity} available
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {showSearchResults && searchQuery && searchResults.length === 0 && !searching && (
                <div className="absolute z-10 w-full mt-2 bg-white border border-slate-200 rounded-lg shadow-lg p-4 text-center text-text-secondary">
                  No medicines found
                </div>
              )}
            </div>

            {/* Billed Medicines List */}
            {billedMedicines.length > 0 ? (
              <div className="space-y-4">
                {billedMedicines.map((med, index) => (
                  <div key={index} className="border border-slate-200 rounded-lg p-4 relative">
                    <button
                      type="button"
                      onClick={() => removeBilledMedicine(index)}
                      className="absolute top-2 right-2 text-red-500 hover:text-red-700 p-1"
                    >
                      <FiTrash2 />
                    </button>
                    
                    <div className="mb-3">
                      <div className="font-medium text-text-primary flex items-center">
                        <FiPackage className="mr-2 text-primary" />
                        {med.medicineName}
                      </div>
                      <div className="text-sm text-text-secondary">
                        ₹{(med.price / 100).toFixed(2)} per {med.unit} • Stock: {med.stockQuantity}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      <input
                        type="text"
                        placeholder="Dosage"
                        value={med.dosage}
                        onChange={(e) => updateBilledMedicine(index, 'dosage', e.target.value)}
                        className="w-full bg-bg-page border border-slate-300/70 rounded-lg h-10 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        required
                      />
                      <input
                        type="text"
                        placeholder="Frequency"
                        value={med.frequency}
                        onChange={(e) => updateBilledMedicine(index, 'frequency', e.target.value)}
                        className="w-full bg-bg-page border border-slate-300/70 rounded-lg h-10 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        required
                      />
                      <input
                        type="text"
                        placeholder="Duration"
                        value={med.duration}
                        onChange={(e) => updateBilledMedicine(index, 'duration', e.target.value)}
                        className="w-full bg-bg-page border border-slate-300/70 rounded-lg h-10 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        required
                      />
                      <input
                        type="number"
                        placeholder="Qty"
                        value={med.quantity}
                        onChange={(e) => updateBilledMedicine(index, 'quantity', parseInt(e.target.value) || 1)}
                        min="1"
                        max={med.stockQuantity}
                        className="w-full bg-bg-page border border-slate-300/70 rounded-lg h-10 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        required
                      />
                      <input
                        type="text"
                        placeholder="Instructions"
                        value={med.instructions}
                        onChange={(e) => updateBilledMedicine(index, 'instructions', e.target.value)}
                        className="w-full bg-bg-page border border-slate-300/70 rounded-lg h-10 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                    
                    <div className="mt-2 text-right text-sm font-medium text-primary">
                      Subtotal: ₹{((med.price * med.quantity) / 100).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-text-secondary">
                <FiPackage className="mx-auto text-4xl mb-2 opacity-50" />
                <p>No billed items added yet. Search inventory to add medicines.</p>
              </div>
            )}
          </div>

          {/* Prescribed-Only Items Section */}
          <div className="bg-white dark:bg-bg-card-dark p-6 rounded-xl shadow-card dark:shadow-card-dark">
            <h3 className="font-semibold text-lg flex items-center mb-4">
              <FiEdit className="mr-2 text-primary" /> 
              Prescribed-Only Items (Not Billed)
            </h3>
            
            {prescribedOnlyMedicines.length > 0 ? (
              <div className="space-y-4 mb-4">
                {prescribedOnlyMedicines.map((med, index) => (
                  <div key={index} className="border border-slate-200 rounded-lg p-4 relative bg-slate-50">
                    <button
                      type="button"
                      onClick={() => removePrescribedOnly(index)}
                      className="absolute top-2 right-2 text-red-500 hover:text-red-700 p-1"
                    >
                      <FiTrash2 />
                    </button>
                    
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                      <input
                        type="text"
                        placeholder="Medicine Name"
                        value={med.medicineName}
                        onChange={(e) => updatePrescribedOnly(index, 'medicineName', e.target.value)}
                        className="w-full bg-white border border-slate-300/70 rounded-lg h-10 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        required
                      />
                      <input
                        type="text"
                        placeholder="Dosage"
                        value={med.dosage}
                        onChange={(e) => updatePrescribedOnly(index, 'dosage', e.target.value)}
                        className="w-full bg-white border border-slate-300/70 rounded-lg h-10 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        required
                      />
                      <input
                        type="text"
                        placeholder="Frequency"
                        value={med.frequency}
                        onChange={(e) => updatePrescribedOnly(index, 'frequency', e.target.value)}
                        className="w-full bg-white border border-slate-300/70 rounded-lg h-10 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        required
                      />
                      <input
                        type="text"
                        placeholder="Duration"
                        value={med.duration}
                        onChange={(e) => updatePrescribedOnly(index, 'duration', e.target.value)}
                        className="w-full bg-white border border-slate-300/70 rounded-lg h-10 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        required
                      />
                      <input
                        type="text"
                        placeholder="Instructions"
                        value={med.instructions}
                        onChange={(e) => updatePrescribedOnly(index, 'instructions', e.target.value)}
                        className="w-full bg-white border border-slate-300/70 rounded-lg h-10 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-text-secondary">
                No prescribed-only medicines added
              </div>
            )}
            <button
              type="button"
              onClick={addPrescribedOnly}
              className="flex items-center text-sm font-semibold text-primary hover:text-primary-light transition-colors"
            >
              <FiPlus className="mr-1" /> Add Prescribed-Only Medicine
            </button>
          </div>

          {/* Doctor Fee removed: prepaid at booking */}

          {/* Bill Summary */}
          {billedMedicines.length > 0 && (
            <div className="bg-gradient-to-br from-primary/5 to-primary/10 p-6 rounded-xl border border-primary/20">
              <h3 className="font-semibold text-lg mb-4">Bill Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Medicines Total:</span>
                  <span className="font-medium">
                    ₹{(billedMedicines.reduce((sum, m) => sum + (m.price * m.quantity), 0) / 100).toFixed(2)}
                  </span>
                </div>
                {/* Doctor fee removed from summary */}
                <div className="border-t border-primary/20 pt-2 mt-2 flex justify-between text-lg font-bold text-primary">
                  <span>Total Amount:</span>
                  <span>₹{(calculateTotal() / 100).toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => navigate('/doctor/appointments')}
              className="flex-1 bg-slate-200 text-slate-700 font-bold h-12 rounded-lg hover:bg-slate-300 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-primary text-white font-bold h-12 rounded-lg disabled:opacity-50 hover:bg-primary-light transition-all"
            >
              {saving ? 'Creating...' : billedMedicines.length > 0 ? 'Create Prescription & Generate Bill' : 'Create Prescription'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
