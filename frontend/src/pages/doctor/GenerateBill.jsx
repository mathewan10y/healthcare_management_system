import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiDollarSign, FiPlus, FiTrash2, FiArrowLeft, FiFileText } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../services/api';

export default function GenerateBill() {
  const navigate = useNavigate();
  const location = useLocation();
  const appointment = location.state?.appointment;

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([
    { description: 'Consultation Fee', quantity: 1, amount: '' }
  ]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!appointment) {
      toast.error('No appointment selected');
      navigate('/doctor/appointments');
    }
  }, [appointment, navigate]);

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, amount: '' }]);
  };

  const removeItem = (index) => {
    if (items.length === 1) {
      toast.error('At least one item is required');
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const calculateTotal = () => {
    return items.reduce((total, item) => {
      const amount = parseFloat(item.amount) || 0;
      const quantity = parseInt(item.quantity) || 0;
      return total + (amount * quantity);
    }, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    const invalidItem = items.find(
      item => !item.description.trim() || !item.amount || parseFloat(item.amount) <= 0 || !item.quantity || parseInt(item.quantity) <= 0
    );

    if (invalidItem) {
      toast.error('Please fill in all item details with valid positive amounts and quantities');
      return;
    }

    setLoading(true);
    try {
      // Convert amounts from rupees to paise
      const formattedItems = items.map(item => ({
        description: item.description.trim(),
        quantity: parseInt(item.quantity),
        amount: Math.round(parseFloat(item.amount) * 100) // Convert to paise
      }));

      const totalAmount = Math.round(calculateTotal() * 100); // Convert to paise

      const billData = {
        appointmentId: appointment._id,
        patientId: appointment.patientId._id,
        items: formattedItems,
        totalAmount,
        notes: notes.trim()
      };

      const res = await api.post('/doctors/bills', billData);

      if (res.data.success) {
        toast.success('Bill generated successfully!');
        navigate('/doctor/appointments');
      }
    } catch (err) {
      console.error('Error generating bill:', err);
      toast.error(err.response?.data?.message || 'Failed to generate bill');
    } finally {
      setLoading(false);
    }
  };

  if (!appointment) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/doctor/appointments')}
          className="p-2 text-text-secondary hover:text-text-primary hover:bg-bg-card-hover rounded-xl border border-border-subtle transition-colors"
          aria-label="Back to appointments"
        >
          <FiArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Generate Bill</h1>
          <p className="text-xs text-text-muted mt-0.5">Create a bill for completed appointment</p>
        </div>
      </div>

      {/* Appointment Summary Banner */}
      <div className="bg-primary-subtle border border-primary-border rounded-2xl p-5 shadow-sm">
        <h3 className="font-bold text-primary mb-3 text-sm">Appointment Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-text-secondary">
          <p><span className="font-semibold text-text-primary">Patient:</span> {appointment.patientId?.name}</p>
          <p><span className="font-semibold text-text-primary">Date:</span> {new Date(appointment.date).toLocaleDateString()}</p>
          <p><span className="font-semibold text-text-primary">Time:</span> {appointment.timeSlot}</p>
          <p><span className="font-semibold text-text-primary">Status:</span> <span className="capitalize">{appointment.status}</span></p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-bg-card rounded-2xl shadow-card border border-border-subtle p-6 space-y-6">
        <div>
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-border-subtle">
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <FiFileText className="text-primary" />
              Bill Items
            </h2>
            <button
              type="button"
              onClick={addItem}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-hover transition-colors font-semibold text-xs shadow-sm"
            >
              <FiPlus className="w-4 h-4" />
              Add Item
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="flex gap-3 items-center p-3 bg-bg-muted border border-border-subtle rounded-xl">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-3">
                  <div className="md:col-span-6">
                    <input
                      type="text"
                      placeholder="Description (e.g., Consultation Fee, Medicine)"
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                      className="w-full px-4 py-2.5 bg-bg-card text-text-primary border border-border-subtle rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <input
                      type="number"
                      placeholder="Qty"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                      className="w-full px-4 py-2.5 bg-bg-card text-text-primary border border-border-subtle rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                      required
                    />
                  </div>
                  <div className="md:col-span-4">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted font-bold">₹</span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Amount (per item)"
                        value={item.amount}
                        onChange={(e) => updateItem(index, 'amount', e.target.value)}
                        className="w-full pl-8 pr-4 py-2.5 bg-bg-card text-text-primary border border-border-subtle rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                        required
                      />
                    </div>
                  </div>
                </div>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"
                    aria-label="Remove item"
                  >
                    <FiTrash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5">
            Additional Notes (Optional)
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any additional notes or instructions..."
            className="w-full px-4 py-2.5 bg-bg-input text-text-primary border border-border-subtle rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
          />
        </div>

        <div className="bg-bg-muted rounded-xl p-4 border border-border-subtle">
          <div className="flex items-center justify-between text-base">
            <span className="font-bold text-text-primary flex items-center gap-2">
              <FiDollarSign className="text-green-500 w-5 h-5" />
              Total Amount
            </span>
            <span className="text-2xl font-black text-primary">
              ₹{calculateTotal().toFixed(2)}
            </span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate('/doctor/appointments')}
            className="flex-1 px-6 py-2.5 border border-border-subtle text-text-secondary font-semibold rounded-xl hover:bg-bg-card-hover transition-colors text-sm"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 px-6 py-2.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary-hover transition-colors shadow-md disabled:opacity-50 text-sm"
            disabled={loading}
          >
            {loading ? 'Creating Bill...' : 'Create Bill'}
          </button>
        </div>
      </form>
    </div>
  );
}
