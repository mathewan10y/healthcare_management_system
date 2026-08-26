import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiCalendar, FiUser, FiCheckCircle, FiClock } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../services/api';

export default function ViewBill() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);

  // Format legacy description pattern: "(N for M)" -> "(N times for M days)"
  const formatDescription = (text) => {
    if (typeof text !== 'string') return text;
    return text.replace(/\((\d+)\s+for\s+(\d+)\)/g, '($1 times for $2 days)');
  };

  useEffect(() => {
    const fetchBill = async () => {
      try {
        const res = await api.get(`/doctors/bills/${id}`);
        setBill(res.data.data);
      } catch {
        toast.error('Failed to load bill');
        navigate('/doctor/appointments');
      } finally {
        setLoading(false);
      }
    };

    fetchBill();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!bill) {
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
          <h1 className="text-3xl font-bold text-text-primary">Bill Details</h1>
          <p className="text-xs text-text-muted mt-0.5">Read-only view</p>
        </div>
      </div>

      {/* Bill Card */}
      <div className="bg-bg-card text-text-primary rounded-2xl shadow-card border border-border-subtle p-6 space-y-6">
        {/* Patient & Status Info */}
        <div className="grid md:grid-cols-3 gap-4 pb-6 border-b border-border-subtle">
          <div className="flex items-start gap-3 p-4 bg-bg-muted rounded-xl border border-border-subtle">
            <div className="p-2.5 bg-blue-500/10 rounded-xl text-primary">
              <FiUser className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-text-muted uppercase tracking-wider">Patient</div>
              <div className="font-bold text-text-primary text-base mt-0.5">{bill.patientId?.name}</div>
              <div className="text-xs text-text-secondary mt-0.5">{bill.patientId?.email}</div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-bg-muted rounded-xl border border-border-subtle">
            <div className="p-2.5 bg-green-500/10 rounded-xl text-green-500">
              <FiCalendar className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-text-muted uppercase tracking-wider">Appointment</div>
              <div className="font-bold text-text-primary text-base mt-0.5">
                {new Date(bill.appointmentId?.date).toLocaleDateString()}
              </div>
              <div className="text-xs text-text-secondary mt-0.5">{bill.appointmentId?.timeSlot}</div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-bg-muted rounded-xl border border-border-subtle">
            <div className={`p-2.5 rounded-xl ${bill.status === 'paid' ? 'bg-green-500/10 text-green-500' : 'bg-amber-500/10 text-amber-500'}`}>
              {bill.status === 'paid' ? (
                <FiCheckCircle className="w-5 h-5" />
              ) : (
                <FiClock className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="text-xs font-semibold text-text-muted uppercase tracking-wider">Payment Status</div>
              <div className={`font-bold text-base mt-0.5 capitalize ${bill.status === 'paid' ? 'text-green-500' : 'text-amber-500'}`}>
                {bill.status}
              </div>
              {bill.paidAt && (
                <div className="text-xs text-text-muted mt-0.5">
                  {new Date(bill.paidAt).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bill Items */}
        <div>
          <h3 className="font-bold text-text-primary text-base mb-4">Bill Items</h3>
          <div className="overflow-x-auto border border-border-subtle rounded-xl bg-bg-card">
            <table className="w-full">
              <thead className="bg-bg-muted border-b border-border-subtle">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-text-muted">Description</th>
                  <th className="text-center py-3 px-4 text-xs font-bold uppercase tracking-wider text-text-muted">Quantity</th>
                  <th className="text-right py-3 px-4 text-xs font-bold uppercase tracking-wider text-text-muted">Unit Price</th>
                  <th className="text-right py-3 px-4 text-xs font-bold uppercase tracking-wider text-text-muted">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {bill.items.map((item, index) => (
                  <tr key={index} className="hover:bg-bg-card-hover/50 transition-colors">
                    <td className="py-3.5 px-4 text-sm text-text-primary font-medium">{formatDescription(item.description)}</td>
                    <td className="py-3.5 px-4 text-center text-sm text-text-secondary">{item.quantity}</td>
                    <td className="py-3.5 px-4 text-right text-sm text-text-secondary">
                      ₹{(item.amount / 100).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-sm text-text-primary">
                      ₹{((item.amount * item.quantity) / 100).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-bg-muted/70 border-t border-border-subtle">
                <tr>
                  <td colSpan="3" className="py-4 px-4 text-right font-bold text-text-primary text-sm">
                    Total Amount:
                  </td>
                  <td className="py-4 px-4 text-right font-extrabold text-primary text-xl">
                    ₹{(bill.totalAmount / 100).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Payment Information */}
        {bill.status === 'paid' && bill.paymentDetails && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
            <h4 className="font-bold text-green-600 dark:text-green-400 text-sm mb-2">Payment Information</h4>
            <div className="grid sm:grid-cols-2 gap-3 text-xs">
              {bill.paymentDetails.orderId && (
                <div>
                  <span className="text-text-muted">Order ID:</span>
                  <span className="ml-2 font-mono font-medium text-text-primary">{bill.paymentDetails.orderId}</span>
                </div>
              )}
              {bill.paymentDetails.paymentId && (
                <div>
                  <span className="text-text-muted">Payment ID:</span>
                  <span className="ml-2 font-mono font-medium text-text-primary">{bill.paymentDetails.paymentId}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Unpaid Notice */}
        {bill.status === 'unpaid' && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <FiClock className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-amber-600 dark:text-amber-400 text-sm mb-1">Payment Pending</h4>
                <p className="text-xs text-text-secondary">
                  This bill is awaiting payment from the patient. The patient can make the payment through their dashboard.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Bill Metadata */}
        <div className="pt-4 border-t border-border-subtle text-xs text-text-muted">
          <div className="flex justify-between">
            <span>Bill Created:</span>
            <span className="font-medium text-text-primary">
              {new Date(bill.createdAt).toLocaleString()}
            </span>
          </div>
          {bill.updatedAt && bill.updatedAt !== bill.createdAt && (
            <div className="flex justify-between mt-1">
              <span>Last Updated:</span>
              <span className="font-medium text-text-primary">
                {new Date(bill.updatedAt).toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => navigate('/doctor/appointments')}
          className="px-6 py-2.5 bg-bg-muted hover:bg-bg-card-hover text-text-primary border border-border-subtle rounded-xl font-semibold text-sm transition-colors"
        >
          Back to Appointments
        </button>
        <button
          onClick={() => window.print()}
          className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl font-semibold text-sm transition-colors shadow-md"
        >
          Print Bill
        </button>
      </div>
    </div>
  );
}
