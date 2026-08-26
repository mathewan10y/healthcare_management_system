import { useEffect, useState, useCallback } from 'react';
import { 
  FiAlertTriangle, FiCheckCircle, FiXCircle, FiRefreshCw, 
  FiDollarSign, FiClock, FiFileText, FiShield, FiUser, FiInfo, FiActivity 
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useSocket } from '../../contexts/SocketContext';
import {
  ModernTableContainer,
  ModernTableHeader,
  ModernTableRow,
  ModernTableCell,
  StatusBadge,
  DateTimeDisplay,
  Avatar,
  EmptyState
} from '../../components/ui';

export default function DisputeLedger() {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLogsAppt, setSelectedLogsAppt] = useState(null);
  const [rulingAppt, setRulingAppt] = useState(null);
  const [rulingChoice, setRulingChoice] = useState('patient'); // 'patient' | 'doctor'
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { socket } = useSocket();

  const loadDisputes = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const res = await api.get('/appointments/admin/disputes');
      setDisputes(res.data?.data || []);
    } catch (err) {
      console.error('Error loading admin disputes:', err);
      toast.error('Failed to load disputes ledger');
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDisputes();
  }, [loadDisputes]);

  // Real-time socket updates
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = () => {
      loadDisputes(false);
    };

    socket.on('appointment:disputed', handleUpdate);
    socket.on('appointment:updated', handleUpdate);
    socket.on('dispute:resolved', handleUpdate);

    return () => {
      socket.off('appointment:disputed', handleUpdate);
      socket.off('appointment:updated', handleUpdate);
      socket.off('dispute:resolved', handleUpdate);
    };
  }, [socket, loadDisputes]);

  const handleResolveDispute = async (e) => {
    e.preventDefault();
    if (!rulingAppt) return;

    setSubmitting(true);
    const toastId = toast.loading(`Executing ruling for ${rulingChoice} & settling escrow...`);
    try {
      const res = await api.post(`/appointments/admin/disputes/${rulingAppt._id}/resolve`, {
        ruling: rulingChoice,
        resolutionNotes: resolutionNotes.trim() || `Admin ruled in favor of ${rulingChoice}`,
      });

      if (res.data?.success) {
        toast.dismiss(toastId);
        toast.success(`Dispute ruled for ${rulingChoice}! Escrow ledger settled.`);
        setRulingAppt(null);
        setResolutionNotes('');
        await loadDisputes(false);
      }
    } catch (err) {
      toast.dismiss(toastId);
      toast.error(err.response?.data?.message || 'Failed to resolve dispute');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { label: 'Appointment & Time', icon: <FiClock className="w-4 h-4 text-primary" /> },
    { label: 'Doctor & Patient', icon: <FiUser className="w-4 h-4 text-teal-500" /> },
    { label: 'Escrow Amount', icon: <FiDollarSign className="w-4 h-4 text-amber-500" /> },
    { label: 'Dispute Reason & State', icon: <FiAlertTriangle className="w-4 h-4 text-rose-500" /> },
    { label: 'Audit Logs', icon: <FiActivity className="w-4 h-4 text-indigo-500" /> },
    { label: 'Arbitration Action', icon: <FiShield className="w-4 h-4 text-green-500" /> }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-1">Arbitration & Dispute Ledger</h1>
          <p className="text-text-secondary text-sm">
            Review QR check-in logs, investigate contested claims, and execute escrow settlements
          </p>
        </div>
        <button
          onClick={() => loadDisputes()}
          className="self-start flex items-center gap-2 px-4 py-2 bg-bg-card hover:bg-bg-card-hover border border-border-subtle rounded-xl text-text-primary font-semibold text-xs transition-colors shadow-sm"
        >
          <FiRefreshCw className="w-3.5 h-3.5" />
          Refresh Ledger
        </button>
      </div>

      {/* Disputes Table */}
      <ModernTableContainer
        title="Dispute Cases & Escrow Arbitrations"
        subtitle={`${disputes.length} case${disputes.length !== 1 ? 's' : ''} recorded`}
      >
        {disputes.length === 0 ? (
          <EmptyState
            icon={<FiShield className="w-8 h-8 text-green-500" />}
            title="All Clear - No Active Disputes"
            description="There are currently no disputed appointments requiring admin arbitration."
          />
        ) : (
          <table className="min-w-full">
            <ModernTableHeader columns={columns} />
            <tbody>
              {disputes.map((appt, index) => {
                const dispute = appt.dispute || {};
                const isPending = dispute.status === 'pending_doctor';
                const isCountered = dispute.status === 'countered';
                const isResolvedPatient = dispute.status === 'resolved_patient';
                const isResolvedDoctor = dispute.status === 'resolved_doctor';
                const isResolved = isResolvedPatient || isResolvedDoctor;

                return (
                  <ModernTableRow key={appt._id} isEven={index % 2 === 0}>
                    {/* Appointment Info */}
                    <ModernTableCell>
                      <div className="space-y-1">
                        <DateTimeDisplay date={appt.date} time={appt.timeSlot} />
                        <span className="font-mono text-[10px] text-text-muted block">
                          ID: #{appt._id.slice(-8)}
                        </span>
                      </div>
                    </ModernTableCell>

                    {/* Doctor & Patient */}
                    <ModernTableCell>
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-600 dark:text-teal-400">
                            Dr
                          </span>
                          <span className="font-bold text-text-primary">
                            {appt.doctorId?.name || 'Doctor'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-blue-500/10 text-primary">
                            Pt
                          </span>
                          <span className="font-medium text-text-secondary">
                            {appt.patientId?.name || 'Patient'}
                          </span>
                        </div>
                      </div>
                    </ModernTableCell>

                    {/* Escrow Amount */}
                    <ModernTableCell>
                      <div>
                        <span className="text-base font-black text-text-primary block">
                          ₹{((appt.escrowAmount || 25000) / 100).toFixed(2)}
                        </span>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                          appt.escrowStatus === 'released_to_doctor' ? 'bg-green-500/10 text-green-600 dark:text-green-400' :
                          appt.escrowStatus === 'refunded_to_patient' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400' :
                          'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        }`}>
                          {appt.escrowStatus || 'held'}
                        </span>
                      </div>
                    </ModernTableCell>

                    {/* Dispute Reason & State */}
                    <ModernTableCell className="max-w-xs">
                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-center gap-1.5">
                          {isPending && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                              Awaiting Doctor Response
                            </span>
                          )}
                          {isCountered && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30 animate-pulse">
                              Countered by Doctor (Escalated)
                            </span>
                          )}
                          {isResolvedPatient && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/15 text-green-600 dark:text-green-400">
                              Ruled for Patient (Refunded)
                            </span>
                          )}
                          {isResolvedDoctor && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-primary">
                              Ruled for Doctor (Released)
                            </span>
                          )}
                        </div>
                        <p className="text-text-primary font-medium italic truncate" title={dispute.reason}>
                          "{dispute.reason || 'Check-in issue reported'}"
                        </p>
                        {dispute.doctorNotes && (
                          <div className="p-2 bg-bg-muted rounded-lg text-[11px] text-text-secondary border border-border-subtle">
                            <span className="font-bold block text-text-primary">Doctor Response:</span>
                            {dispute.doctorNotes}
                          </div>
                        )}
                      </div>
                    </ModernTableCell>

                    {/* Audit Logs Button */}
                    <ModernTableCell>
                      <button
                        type="button"
                        onClick={() => setSelectedLogsAppt(appt)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-muted hover:bg-bg-card-hover border border-border-subtle rounded-xl text-xs font-semibold text-text-primary transition-colors shadow-sm"
                      >
                        <FiActivity className="w-3.5 h-3.5 text-primary" />
                        View Logs ({appt.systemLogs?.length || 0})
                      </button>
                    </ModernTableCell>

                    {/* Arbitration Actions */}
                    <ModernTableCell>
                      {!isResolved ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setRulingAppt(appt);
                              setRulingChoice('patient');
                            }}
                            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                          >
                            Rule for Patient
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRulingAppt(appt);
                              setRulingChoice('doctor');
                            }}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                          >
                            Rule for Doctor
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-text-muted font-medium flex items-center gap-1">
                          <FiCheckCircle className="w-3.5 h-3.5 text-green-500" /> Settled
                        </span>
                      )}
                    </ModernTableCell>
                  </ModernTableRow>
                );
              })}
            </tbody>
          </table>
        )}
      </ModernTableContainer>

      {/* System Audit Logs Modal */}
      {selectedLogsAppt && (
        <div className="fixed inset-0 z-[1300] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative z-[1301] w-full max-w-2xl bg-bg-card text-text-primary rounded-3xl shadow-2xl border border-border-subtle overflow-hidden animate-fade-in-fast">
            <div className="px-6 py-5 border-b border-border-subtle bg-bg-muted flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  <FiActivity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-text-primary">System Audit Trail</h3>
                  <p className="text-xs text-text-muted">Appointment #{selectedLogsAppt._id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLogsAppt(null)}
                className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-bg-card-hover transition-colors"
              >
                <FiXCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3 p-4 bg-bg-muted rounded-2xl border border-border-subtle text-xs">
                <div>
                  <span className="text-text-muted block">Check-in Method:</span>
                  <span className="font-bold text-text-primary font-mono uppercase">{selectedLogsAppt.checkInMethod || 'none'}</span>
                </div>
                <div>
                  <span className="text-text-muted block">Manual Bypass Flag:</span>
                  <span className={`font-bold ${selectedLogsAppt.manual_bypass ? 'text-amber-500' : 'text-green-500'}`}>
                    {selectedLogsAppt.manual_bypass ? 'TRUE (Offline PIN)' : 'FALSE (QR Cryptography)'}
                  </span>
                </div>
              </div>

              <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">Chronological Event Logs</h4>

              <div className="space-y-3">
                {(!selectedLogsAppt.systemLogs || selectedLogsAppt.systemLogs.length === 0) ? (
                  <p className="text-xs text-text-muted italic">No system audit events recorded for this appointment.</p>
                ) : (
                  selectedLogsAppt.systemLogs.map((log, idx) => (
                    <div key={idx} className="p-3 bg-bg-muted rounded-xl border border-border-subtle text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-primary text-[11px]">{log.action}</span>
                        <span className="text-[10px] text-text-muted">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-text-secondary">
                        <span className="font-semibold uppercase text-text-muted">Actor: {log.actor}</span>
                        {log.details && (
                          <span className="font-mono text-[10px] bg-bg-card px-2 py-0.5 rounded border border-border-subtle">
                            {JSON.stringify(log.details)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="px-6 py-4 bg-bg-muted border-t border-border-subtle text-right">
              <button
                type="button"
                onClick={() => setSelectedLogsAppt(null)}
                className="px-4 py-2 bg-bg-card hover:bg-bg-card-hover border border-border-subtle rounded-xl text-xs font-bold text-text-primary"
              >
                Close Audit Logs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Arbitration Ruling Execution Modal */}
      {rulingAppt && (
        <div className="fixed inset-0 z-[1300] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative z-[1301] w-full max-w-lg bg-bg-card text-text-primary rounded-3xl shadow-2xl border border-border-subtle overflow-hidden animate-fade-in-fast">
            <div className="px-6 py-5 border-b border-border-subtle bg-bg-muted flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  <FiShield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-text-primary">Execute Arbitration Ruling</h3>
                  <p className="text-xs text-text-muted">Escrow Settlement & Ledger Audit</p>
                </div>
              </div>
              <button
                onClick={() => setRulingAppt(null)}
                className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-bg-card-hover transition-colors"
              >
                <FiXCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResolveDispute} className="p-6 space-y-5">
              <div className={`p-4 rounded-2xl border text-xs ${
                rulingChoice === 'patient'
                  ? 'bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-300'
                  : 'bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300'
              }`}>
                <span className="font-bold block mb-1">
                  Ruling in favor of: {rulingChoice.toUpperCase()}
                </span>
                {rulingChoice === 'patient' ? (
                  <>The full held escrow fee of ₹{((rulingAppt.escrowAmount || 25000) / 100).toFixed(2)} will be refunded immediately to patient {rulingAppt.patientId?.name}.</>
                ) : (
                  <>The held escrow fee of ₹{((rulingAppt.escrowAmount || 25000) / 100).toFixed(2)} will be released directly to doctor {rulingAppt.doctorId?.name}.</>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">
                  Arbitration Justification & Resolution Notes
                </label>
                <textarea
                  rows={4}
                  required
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Explain official admin ruling based on QR timestamp logs, manual bypass flags, and clinical records..."
                  className="w-full px-4 py-3 bg-bg-input text-text-primary border border-border-subtle rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-xs"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRulingAppt(null)}
                  className="flex-1 py-3 border border-border-subtle rounded-2xl text-text-secondary font-semibold text-xs hover:bg-bg-card-hover transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`flex-1 py-3 text-white rounded-2xl font-bold text-xs shadow-md transition-all disabled:opacity-50 ${
                    rulingChoice === 'patient' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {submitting ? 'Executing Ruling...' : `Confirm Ruling for ${rulingChoice}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
