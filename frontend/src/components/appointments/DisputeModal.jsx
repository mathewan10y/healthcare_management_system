import { useState } from 'react';
import { FiX, FiAlertTriangle, FiSend } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../services/api';

const PRESET_REASONS = [
  'QR check-in code failed to scan / refresh',
  'Doctor / clinic was unavailable at scheduled time',
  'Incorrect appointment time slot or doctor details',
  'Network deadzone and offline bypass PIN failed',
  'Doctor delayed consultation by more than 30 minutes',
  'Other operational or check-in issue',
];

export default function DisputeModal({ open, appointment, onClose, onSuccess }) {
  const [selectedReason, setSelectedReason] = useState(PRESET_REASONS[0]);
  const [customDetails, setCustomDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!open || !appointment) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const finalReason = customDetails.trim()
      ? `${selectedReason}: ${customDetails.trim()}`
      : selectedReason;

    const toastId = toast.loading('Filing dispute and notifying doctor...');
    try {
      const res = await api.post(`/appointments/${appointment._id}/dispute`, {
        reason: finalReason,
      });

      if (res.data?.success) {
        toast.dismiss(toastId);
        toast.success('Dispute reported successfully. The doctor and admin have been notified.');
        if (onSuccess) onSuccess(res.data.data);
        onClose();
      }
    } catch (err) {
      toast.dismiss(toastId);
      toast.error(err.response?.data?.message || 'Failed to file dispute');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1300] bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative z-[1301] w-full max-w-lg bg-bg-card text-text-primary rounded-3xl shadow-2xl border border-border-subtle overflow-hidden animate-fade-in-fast">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border-subtle bg-amber-500/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <FiAlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-amber-600 dark:text-amber-400">Report Appointment Dispute</h3>
              <p className="text-xs text-text-muted">Escrow protection & resolution system</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-bg-card-hover transition-colors"
            aria-label="Close modal"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="p-4 bg-bg-muted rounded-2xl border border-border-subtle text-xs text-text-secondary">
            <span className="font-semibold text-text-primary block mb-1">How Escrow Protection Works:</span>
            Your consultation fee of <span className="font-bold text-primary">₹{((appointment.escrowAmount || 25000) / 100).toFixed(2)}</span> is safely held in escrow. When a dispute is filed, funds are frozen until the doctor accepts fault (auto-refund) or an admin reviews system audit logs.
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">
              Select Dispute Reason
            </label>
            <div className="space-y-2">
              {PRESET_REASONS.map((reason, idx) => (
                <label
                  key={idx}
                  className={`flex items-start gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                    selectedReason === reason
                      ? 'bg-primary/10 border-primary text-text-primary font-semibold'
                      : 'bg-bg-muted border-border-subtle text-text-secondary hover:bg-bg-card-hover'
                  }`}
                >
                  <input
                    type="radio"
                    name="disputeReason"
                    value={reason}
                    checked={selectedReason === reason}
                    onChange={() => setSelectedReason(reason)}
                    className="mt-0.5 text-primary focus:ring-primary"
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5">
              Additional Details (Optional)
            </label>
            <textarea
              rows={3}
              value={customDetails}
              onChange={(e) => setCustomDetails(e.target.value)}
              placeholder="Provide any additional details or timestamps to assist admin review..."
              className="w-full px-4 py-2.5 bg-bg-input text-text-primary border border-border-subtle rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-xs"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-border-subtle rounded-2xl text-text-secondary font-semibold text-xs hover:bg-bg-card-hover transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                'Filing Dispute...'
              ) : (
                <>
                  <FiSend className="w-4 h-4" />
                  Submit Dispute
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
