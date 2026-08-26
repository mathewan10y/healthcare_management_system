import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { FiX, FiCamera, FiHash, FiAlertTriangle, FiCheckCircle, FiShield, FiKey } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../services/api';

export default function PatientScannerModal({ open, appointment, onClose, onSuccess, onOpenDispute }) {
  const [activeTab, setActiveTab] = useState('camera'); // 'camera' | 'pin'
  const [pin, setPin] = useState('');
  const [scanning, setScanning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const html5QrCodeRef = useRef(null);

  const startScanner = async () => {
    try {
      setCameraError(null);
      setScanning(true);

      const html5QrCode = new Html5Qrcode('qr-reader-target');
      html5QrCodeRef.current = html5QrCode;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      await html5QrCode.start(
        { facingMode: 'environment' },
        config,
        async (decodedText) => {
          // Detected QR code text
          try {
            await stopScanner();
            handleCheckIn(decodedText);
          } catch (err) {
            console.error('Scan handle error:', err);
          }
        },
        () => {
          // Frame parse failure (normal while hunting for QR)
        }
      );
    } catch (err) {
      console.error('Camera start error:', err);
      setCameraError(err.message || 'Unable to access camera. Please allow camera permissions or use the 6-digit offline PIN.');
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    try {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      }
    } catch (e) {
      // Ignore stop errors
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    if (open && activeTab === 'camera') {
      const timer = setTimeout(() => {
        startScanner();
      }, 300);
      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
    }
  }, [open, activeTab]);

  const handleCheckIn = async (qrToken) => {
    setSubmitting(true);
    const toastId = toast.loading('Verifying check-in cryptographic payload...');
    try {
      const res = await api.post('/appointments/check-in', {
        appointmentId: appointment._id,
        qrToken,
      });

      if (res.data?.success) {
        toast.dismiss(toastId);
        toast.success(res.data.message || 'Check-in verified! You are in the waiting queue.');
        if (onSuccess) onSuccess(res.data.data);
        onClose();
      }
    } catch (err) {
      toast.dismiss(toastId);
      const msg = err.response?.data?.message || 'Check-in verification failed. Please try again or use the offline PIN.';
      toast.error(msg);
      // Restart scanner if failed
      if (activeTab === 'camera') {
        setTimeout(startScanner, 1200);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handlePinSubmit = async (e) => {
    e.preventDefault();
    if (!pin || pin.trim().length !== 6) {
      toast.error('Please enter a valid 6-digit offline PIN');
      return;
    }

    setSubmitting(true);
    const toastId = toast.loading('Verifying offline bypass PIN...');
    try {
      const res = await api.post('/appointments/offline-bypass', {
        appointmentId: appointment._id,
        pin: pin.trim(),
      });

      if (res.data?.success) {
        toast.dismiss(toastId);
        toast.success(res.data.message || 'Offline PIN verified! Status set to Waiting.');
        if (onSuccess) onSuccess(res.data.data);
        onClose();
      }
    } catch (err) {
      toast.dismiss(toastId);
      toast.error(err.response?.data?.message || 'Invalid PIN. Please ask the doctor for the 6-digit code.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open || !appointment) return null;

  return (
    <div className="fixed inset-0 z-[1200] bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative z-[1201] w-full max-w-md bg-bg-card text-text-primary rounded-3xl shadow-2xl border border-border-subtle overflow-hidden animate-fade-in-fast">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border-subtle bg-bg-muted flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <FiShield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-text-primary">Appointment Check-in</h3>
              <p className="text-xs text-text-muted">Dr. {appointment.doctorId?.name || 'Doctor'}</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-bg-card-hover transition-colors"
            aria-label="Close modal"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-border-subtle bg-bg-muted/50 p-1.5 gap-1.5 m-4 rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveTab('camera')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'camera'
                ? 'bg-bg-card text-primary shadow-sm border border-border-subtle'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <FiCamera className="w-4 h-4" />
            Scan QR Code
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pin')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'pin'
                ? 'bg-bg-card text-primary shadow-sm border border-border-subtle'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <FiHash className="w-4 h-4" />
            Enter 6-Digit PIN
          </button>
        </div>

        {/* Tab 1: Camera Scanner */}
        {activeTab === 'camera' && (
          <div className="p-6 pt-2 space-y-4">
            <div className="relative w-full aspect-square bg-slate-950 rounded-3xl overflow-hidden border-2 border-border-subtle flex items-center justify-center">
              <div id="qr-reader-target" className="w-full h-full"></div>

              {/* Reticle Overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-52 h-52 border-2 border-primary/70 rounded-2xl relative">
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-primary rounded-tl"></div>
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-primary rounded-tr"></div>
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-primary rounded-bl"></div>
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-primary rounded-br"></div>
                  <div className="w-full h-0.5 bg-primary/80 absolute top-1/2 -translate-y-1/2 animate-pulse"></div>
                </div>
              </div>

              {cameraError && (
                <div className="absolute inset-0 bg-slate-900/95 p-6 flex flex-col items-center justify-center text-center space-y-3 z-10">
                  <FiAlertTriangle className="w-10 h-10 text-amber-500" />
                  <p className="text-xs text-slate-300">{cameraError}</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('pin')}
                    className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-semibold shadow-md"
                  >
                    Switch to 6-Digit PIN
                  </button>
                </div>
              )}
            </div>

            <p className="text-center text-xs text-text-muted">
              Point your camera at the rolling QR code on the doctor's screen
            </p>
          </div>
        )}

        {/* Tab 2: 6-Digit PIN Fallback */}
        {activeTab === 'pin' && (
          <form onSubmit={handlePinSubmit} className="p-6 pt-2 space-y-5">
            <div className="p-4 bg-primary-subtle border border-primary-border rounded-2xl text-xs text-text-secondary">
              <span className="font-bold text-primary block mb-1">Network Deadzone Fallback</span>
              Ask your doctor for the 6-digit bypass PIN displayed on their dashboard.
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">
                6-Digit Offline PIN
              </label>
              <div className="relative">
                <input
                  type="text"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="------"
                  className="w-full py-4 text-center font-mono text-3xl font-black tracking-widest bg-bg-input text-text-primary border-2 border-border-subtle rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || pin.length !== 6}
              className="w-full py-3.5 bg-primary text-white rounded-2xl font-bold text-sm hover:bg-primary-hover transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Verifying PIN...
                </>
              ) : (
                <>
                  <FiKey className="w-4 h-4" />
                  Verify & Check-In
                </>
              )}
            </button>
          </form>
        )}

        {/* Trouble Scanning & Dispute Trigger */}
        <div className="px-6 py-4 bg-bg-muted border-t border-border-subtle text-center">
          <button
            type="button"
            onClick={() => {
              stopScanner();
              onClose();
              if (onOpenDispute) onOpenDispute(appointment);
            }}
            className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center justify-center gap-1.5 mx-auto"
          >
            <FiAlertTriangle className="w-3.5 h-3.5" />
            Trouble scanning or doctor unavailable? Report an issue
          </button>
        </div>
      </div>
    </div>
  );
}
