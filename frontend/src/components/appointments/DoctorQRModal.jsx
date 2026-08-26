import { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { FiX, FiRefreshCw, FiCopy, FiCheck, FiShield, FiWifi, FiHash } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../services/api';

export default function DoctorQRModal({ open, appointment, onClose }) {
  const [qrToken, setQrToken] = useState('');
  const [offlinePin, setOfflinePin] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);

  const fetchToken = useCallback(async () => {
    if (!appointment?._id) return;
    try {
      setLoading(true);
      const res = await api.get(`/appointments/${appointment._id}/qr-token`);
      if (res.data?.success) {
        setQrToken(res.data.data.qrToken);
        setOfflinePin(res.data.data.offlinePin);
        setTimeLeft(30);
      }
    } catch (err) {
      console.error('Error fetching QR token:', err);
      toast.error('Failed to generate rolling QR token');
    } finally {
      setLoading(false);
    }
  }, [appointment?._id]);

  // Initial load
  useEffect(() => {
    if (open && appointment?._id) {
      fetchToken();
    }
  }, [open, appointment?._id, fetchToken]);

  // Rolling 30s countdown timer
  useEffect(() => {
    if (!open || !qrToken) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          fetchToken();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [open, qrToken, fetchToken]);

  const handleCopyPin = () => {
    if (!offlinePin) return;
    navigator.clipboard.writeText(offlinePin);
    setCopied(true);
    toast.success('6-digit offline PIN copied to clipboard');
    setTimeout(() => setCopied(false), 2500);
  };

  if (!open || !appointment) return null;

  const patientName = appointment.patientId?.name || 'Patient';
  const progressPct = ((30 - timeLeft) / 30) * 100;

  return (
    <div className="fixed inset-0 z-[1200] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative z-[1201] w-full max-w-lg bg-bg-card text-text-primary rounded-3xl shadow-2xl border border-border-subtle overflow-hidden animate-fade-in-fast">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border-subtle bg-bg-muted flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <FiShield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-text-primary">Rolling QR Check-in</h3>
              <p className="text-xs text-text-muted">Zero-friction patient arrival verification</p>
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

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Patient Details & Time */}
          <div className="flex items-center justify-between p-4 bg-bg-muted rounded-2xl border border-border-subtle text-sm">
            <div>
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block">Patient</span>
              <span className="font-bold text-text-primary text-base">{patientName}</span>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block">Time Slot</span>
              <span className="font-bold text-primary text-sm">{appointment.timeSlot}</span>
            </div>
          </div>

          {/* QR Code Container */}
          <div className="flex flex-col items-center justify-center py-2">
            <div className="relative p-5 bg-white rounded-3xl shadow-xl border-4 border-primary/20">
              {loading && !qrToken ? (
                <div className="w-56 h-56 flex flex-col items-center justify-center gap-3">
                  <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs text-slate-500 font-medium">Generating cryptographic payload...</p>
                </div>
              ) : (
                <QRCodeSVG
                  value={qrToken}
                  size={220}
                  level="H"
                  includeMargin={true}
                  imageSettings={{
                    src: '/logo.svg',
                    x: undefined,
                    y: undefined,
                    height: 28,
                    width: 28,
                    excavate: true,
                  }}
                />
              )}
            </div>

            {/* Rolling Countdown Progress */}
            <div className="w-full max-w-xs mt-5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-text-muted font-medium">
                  <FiRefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-primary' : ''}`} />
                  Rolling Payload
                </span>
                <span className="font-mono font-bold text-primary text-xs">
                  Refreshes in {timeLeft}s
                </span>
              </div>
              <div className="w-full h-2 bg-bg-muted rounded-full overflow-hidden border border-border-subtle">
                <div
                  className="h-full bg-gradient-to-r from-primary to-primary-hover transition-all duration-1000 ease-linear rounded-full"
                  style={{ width: `${100 - progressPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Offline Bypass PIN (Deadzone Fallback) */}
          <div className="p-4 bg-primary-subtle border-2 border-primary-border rounded-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-primary/10 text-primary rounded-xl">
                  <FiHash className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-primary uppercase tracking-wider block">
                    Offline Bypass PIN
                  </span>
                  <span className="text-xs text-text-muted">For network deadzones</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-2xl font-black text-primary tracking-widest bg-bg-card px-3.5 py-1 rounded-xl border border-primary/30 shadow-sm">
                  {offlinePin || '------'}
                </span>
                <button
                  type="button"
                  onClick={handleCopyPin}
                  className="p-2 rounded-xl bg-bg-card hover:bg-bg-card-hover border border-border-subtle text-text-secondary hover:text-text-primary transition-colors shadow-sm"
                  title="Copy 6-digit PIN"
                >
                  {copied ? <FiCheck className="w-4 h-4 text-green-500" /> : <FiCopy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-bg-muted border-t border-border-subtle flex items-center justify-between text-xs text-text-muted">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
            <span className="font-medium text-text-secondary">WebSocket Real-Time Listener Active</span>
          </div>
          <button
            onClick={fetchToken}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-bg-card hover:bg-bg-card-hover text-text-primary font-semibold border border-border-subtle transition-colors shadow-sm"
          >
            <FiRefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Now
          </button>
        </div>
      </div>
    </div>
  );
}
