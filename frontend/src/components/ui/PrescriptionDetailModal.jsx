import { FiX, FiCalendar, FiUser, FiTag } from 'react-icons/fi';

export default function PrescriptionDetailModal({ open, prescription, onClose }) {
  if (!open || !prescription) return null;

  const stop = (e) => e.stopPropagation();

  const meds = Array.isArray(prescription.medicines) ? prescription.medicines : [];
  const legacyMed = prescription.medication ? [{
    medicineName: prescription.medication,
    dosage: prescription.dosage,
    frequency: '',
    duration: '',
    instructions: prescription.instructions,
  }] : [];

  const allMeds = meds.length > 0 ? meds : legacyMed;

  const statusColors = {
    'New': 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    'Pending Fulfillment': 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    'Filled': 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
    'Partially Filled': 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
    'Cancelled': 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  };

  return (
    <div onClick={onClose} className="fixed inset-0 z-[1200] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div onClick={stop} className="relative z-[1201] w-full max-w-3xl bg-bg-card text-text-primary rounded-2xl shadow-2xl border border-border-subtle overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-bg-muted">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold text-text-primary">Prescription Details</h3>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${statusColors[prescription.status] || 'bg-bg-card-hover text-text-secondary border-border-subtle'}`}>
              <FiTag className="w-3 h-3" /> {prescription.status || 'New'}
            </span>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-bg-card-hover transition-colors" aria-label="Close modal">
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Info grid */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-bg-muted border border-border-subtle">
              <div className="p-2.5 bg-blue-500/10 rounded-xl text-primary"><FiUser className="w-5 h-5" /></div>
              <div>
                <div className="text-xs font-medium text-text-muted">Prescribed By</div>
                <div className="font-semibold text-text-primary text-base mt-0.5">{prescription.doctorId?.name || 'Doctor'}</div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-xl bg-bg-muted border border-border-subtle">
              <div className="p-2.5 bg-green-500/10 rounded-xl text-green-500"><FiCalendar className="w-5 h-5" /></div>
              <div>
                <div className="text-xs font-medium text-text-muted">Date Issued</div>
                <div className="font-semibold text-text-primary text-base mt-0.5">{new Date(prescription.dateIssued).toLocaleDateString()}</div>
              </div>
            </div>
          </div>

          {/* Medicines */}
          <div>
            <h4 className="font-bold text-text-primary mb-3 text-base">Prescribed Medicines</h4>
            {allMeds.length === 0 ? (
              <div className="text-sm text-text-muted p-4 rounded-xl bg-bg-muted text-center">No medicines listed.</div>
            ) : (
              <div className="space-y-3">
                {allMeds.map((med, idx) => (
                  <div key={idx} className="border border-border-subtle rounded-xl p-4 bg-bg-muted">
                    <div className="font-semibold text-text-primary text-sm mb-2">{med.medicineName || 'Medicine'}</div>
                    <div className="grid sm:grid-cols-3 gap-2 text-xs">
                      <div className="p-2 rounded-lg bg-bg-card border border-border-subtle"><span className="text-text-muted block mb-0.5">Dosage</span> <span className="font-medium text-text-primary">{med.dosage || '-'}</span></div>
                      <div className="p-2 rounded-lg bg-bg-card border border-border-subtle"><span className="text-text-muted block mb-0.5">Frequency</span> <span className="font-medium text-text-primary">{med.frequency || '-'}</span></div>
                      <div className="p-2 rounded-lg bg-bg-card border border-border-subtle"><span className="text-text-muted block mb-0.5">Duration</span> <span className="font-medium text-text-primary">{med.duration || '-'}</span></div>
                    </div>
                    {med.instructions && (
                      <div className="mt-3 text-xs text-text-secondary p-2 rounded-lg bg-bg-card border border-border-subtle">
                        <span className="font-medium text-text-primary">Instructions:</span> {med.instructions}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
