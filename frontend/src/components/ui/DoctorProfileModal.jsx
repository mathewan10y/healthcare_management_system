import { FiX, FiMapPin, FiMail, FiStar } from 'react-icons/fi';

export default function DoctorProfileModal({ open, doctor, onClose }) {
  if (!open || !doctor) return null;

  const stop = (e) => e.stopPropagation();
  const d = doctor;
  const rating = typeof d.averageRating === 'number' ? Number(d.averageRating).toFixed(1) : null;

  return (
    <div onClick={onClose} className="fixed inset-0 z-[1300] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div onClick={stop} className="relative z-[1301] w-full max-w-2xl bg-bg-card text-text-primary rounded-2xl shadow-2xl border border-border-subtle overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between bg-bg-muted">
          <h3 className="text-xl font-bold text-text-primary">Doctor Profile</h3>
          <button onClick={onClose} className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-bg-card-hover transition-colors" aria-label="Close modal">
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-6 max-h-[80vh] overflow-y-auto">
          <div className="flex items-center gap-4">
            <img
              src={d.photoUrl ? `http://localhost:5000${d.photoUrl}` : 'https://ui-avatars.com/api/?name=' + encodeURIComponent(d.userId?.name || 'Doctor') + '&size=200&background=0D8ABC&color=fff'}
              alt={d.userId?.name}
              className="w-20 h-20 rounded-full object-cover border-2 border-border-subtle shadow-sm"
              onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(d.userId?.name || 'Doctor') + '&size=200&background=0D8ABC&color=fff'; }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold text-text-primary truncate">{d.userId?.name}</h2>
                {rating && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    <FiStar className="w-3.5 h-3.5 fill-amber-500" /> {rating}
                  </span>
                )}
              </div>
              <p className="text-primary font-medium">{d.specializationId?.name}</p>
              {d.hospitalId && (
                <p className="text-sm text-text-secondary mt-1 flex items-center gap-1">
                  <FiMapPin className="w-4 h-4 text-text-muted" /> {d.hospitalId.name}, {d.hospitalId.district}
                </p>
              )}
            </div>
          </div>

          {d.qualifications && (
            <div className="p-4 rounded-xl bg-bg-muted border border-border-subtle">
              <h4 className="font-semibold text-text-primary mb-1 text-sm">Qualifications</h4>
              <p className="text-text-secondary text-sm">{d.qualifications}</p>
            </div>
          )}

          {d.bio && (
            <div className="p-4 rounded-xl bg-bg-muted border border-border-subtle">
              <h4 className="font-semibold text-text-primary mb-1 text-sm">About</h4>
              <p className="text-text-secondary text-sm whitespace-pre-line">{d.bio}</p>
            </div>
          )}

          {Array.isArray(d.languages) && d.languages.length > 0 && (
            <div>
              <h4 className="font-semibold text-text-primary mb-2 text-sm">Languages</h4>
              <div className="flex flex-wrap gap-2">
                {d.languages.map((lang, idx) => (
                  <span key={idx} className="px-3 py-1 bg-bg-muted border border-border-subtle rounded-lg text-xs font-medium text-text-secondary">
                    {lang}
                  </span>
                ))}
              </div>
            </div>
          )}

          {typeof d.experienceYears === 'number' && (
            <div className="p-4 rounded-xl bg-bg-muted border border-border-subtle">
              <h4 className="font-semibold text-text-primary mb-1 text-sm">Experience</h4>
              <p className="text-text-secondary text-sm">{d.experienceYears} years of clinical practice</p>
            </div>
          )}

          {d.userId?.email && (
            <div className="flex items-center gap-2 text-sm text-text-secondary pt-2">
              <FiMail className="w-4 h-4 text-primary" /> {d.userId.email}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
