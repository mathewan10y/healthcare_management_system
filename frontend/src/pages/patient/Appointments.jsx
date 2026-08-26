import { useEffect, useState, useCallback } from 'react';
import { 
  FiCalendar, FiClock, FiUser, FiFileText, FiStar, FiCheck, 
  FiX, FiAlertTriangle, FiCamera, FiRefreshCw, FiDollarSign, FiShield 
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useSocket } from '../../contexts/SocketContext';
import PatientScannerModal from '../../components/appointments/PatientScannerModal';
import DisputeModal from '../../components/appointments/DisputeModal';
import {
  ModernTableContainer,
  ModernTableHeader,
  ModernTableRow,
  ModernTableCell,
  StatusBadge,
  StarRating,
  DateTimeDisplay,
  Avatar,
  ExpandableText,
  ActionButton,
  EmptyState,
  LoadingState,
  MobileCard
} from '../../components/ui';
import { AppointmentSkeleton } from '../../components/ui/SkeletonLoader';

export default function PatientAppointments() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ratingInputs, setRatingInputs] = useState({});
  const [submittingId, setSubmittingId] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  
  // Modals state
  const [scannerAppt, setScannerAppt] = useState(null);
  const [disputeAppt, setDisputeAppt] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState(null);

  const { socket } = useSocket();

  const load = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const res = await api.get('/patients/appointments');
      setList(res.data.data || []);
    } catch (e) {
      console.error('Error fetching patient appointments:', e);
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Real-time WebSocket Listeners
  useEffect(() => {
    if (!socket) return;

    const handleUpdated = () => {
      load(false);
    };

    const handleInProgress = (data) => {
      toast.success('🔔 Your consultation has started! Please proceed to the doctor\'s room.', {
        duration: 9000,
        icon: '👨‍⚕️',
      });
      load(false);
    };

    const handleCompleted = () => {
      toast.success('✅ Consultation complete! Your prescription and bill are ready.', {
        duration: 7000,
      });
      load(false);
    };

    const handleDisputeResolved = (data) => {
      toast.success(`Dispute Ruling: Admin ruled in favor of ${data.ruling}.`, {
        duration: 8000,
      });
      load(false);
    };

    socket.on('appointment:updated', handleUpdated);
    socket.on('appointment:in_progress', handleInProgress);
    socket.on('appointment:completed', handleCompleted);
    socket.on('dispute:resolved', handleDisputeResolved);

    return () => {
      socket.off('appointment:updated', handleUpdated);
      socket.off('appointment:in_progress', handleInProgress);
      socket.off('appointment:completed', handleCompleted);
      socket.off('dispute:resolved', handleDisputeResolved);
    };
  }, [socket, load]);

  const handleRating = async (appointmentId, rating) => {
    setSubmittingId(appointmentId);
    try {
      await api.post(`/patients/appointments/${appointmentId}/rate`, { rating });
      setList(prev => prev.map(x => x._id === appointmentId ? { ...x, isRated: true } : x));
      toast.success('Rating submitted successfully!');
      setRatingInputs(prev => ({ ...prev, [appointmentId]: 0 }));
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to submit rating');
    } finally {
      setSubmittingId(null);
    }
  };

  // 24-hour Escrow Cancellation Policy Evaluation
  const evaluateCancellationPolicy = (appointment) => {
    try {
      const now = new Date();
      const apptDate = new Date(appointment.date);
      const timeSlot = appointment.timeSlot || '09:00-09:30';
      const startTime = timeSlot.split('-')[0].trim();
      const [hours, minutes] = startTime.split(':').map(Number);

      const apptDateTime = new Date(Date.UTC(
        apptDate.getUTCFullYear(),
        apptDate.getUTCMonth(),
        apptDate.getUTCDate(),
        hours || 9,
        minutes || 0,
        0
      ));

      const diffMs = apptDateTime.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      return {
        diffHours,
        isFullRefund: diffHours >= 24,
        isPast: diffMs < 0,
      };
    } catch {
      return { diffHours: 0, isFullRefund: false, isPast: false };
    }
  };

  const handleCancelAppointment = async () => {
    if (!appointmentToCancel) return;
    
    setCancellingId(appointmentToCancel._id);
    const loadingToast = toast.loading('Processing escrow cancellation...');
    
    try {
      const response = await api.post(`/appointments/${appointmentToCancel._id}/cancel`);
      toast.dismiss(loadingToast);
      toast.success(response.data.message || 'Appointment cancelled successfully');
      setShowCancelModal(false);
      setAppointmentToCancel(null);
      await load(false);
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error(error?.response?.data?.message || 'Failed to cancel appointment');
    } finally {
      setCancellingId(null);
    }
  };

  const columns = [
    { label: 'Date & Time', icon: <FiCalendar className="w-4 h-4 text-primary" /> },
    { label: 'Doctor', icon: <FiUser className="w-4 h-4 text-teal-500" /> },
    { label: 'Status & Check-in', icon: <FiCheck className="w-4 h-4 text-green-500" /> },
    { label: 'Escrow Fee', icon: <FiDollarSign className="w-4 h-4 text-amber-500" /> },
    { label: 'Rating', icon: <FiStar className="w-4 h-4 text-yellow-500" /> },
    { label: 'Actions', icon: <FiX className="w-4 h-4 text-red-500" /> }
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-1">My Appointments</h1>
          <p className="text-text-secondary text-sm">Zero-friction QR check-in, real-time waiting queue, and escrow receipts</p>
        </div>
        <div className="hidden md:block">
          <ModernTableContainer>
            <AppointmentSkeleton count={5} />
          </ModernTableContainer>
        </div>
        <div className="md:hidden space-y-4">
          <AppointmentSkeleton count={3} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-1">My Appointments</h1>
          <p className="text-text-secondary text-sm">Scan doctor QR code to check in instantly, monitor live queue, and manage escrow</p>
        </div>
        <button
          onClick={() => load()}
          className="self-start flex items-center gap-2 px-4 py-2 bg-bg-card hover:bg-bg-card-hover border border-border-subtle rounded-xl text-text-primary font-semibold text-xs transition-colors shadow-sm"
        >
          <FiRefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block">
        <ModernTableContainer
          title="Appointments & Check-in Status"
          subtitle={`${list.length} appointment${list.length !== 1 ? 's' : ''} on record`}
        >
          {list.length === 0 ? (
            <EmptyState
              icon={<FiCalendar className="w-8 h-8 text-text-muted" />}
              title="No Appointments Scheduled"
              description="You don't have any appointments booked yet. Book one from the doctor directory."
            />
          ) : (
            <table className="min-w-full">
              <ModernTableHeader columns={columns} />
              <tbody>
                {list.map((appointment, index) => {
                  const isScheduled = appointment.status === 'Scheduled';
                  const isWaiting = appointment.status === 'Waiting';
                  const isInProgress = appointment.status === 'In_Progress';
                  const isDisputed = appointment.status === 'Disputed';
                  const isCompleted = appointment.status === 'Completed';
                  const isCancelled = appointment.status === 'Cancelled' || appointment.status?.includes('cancelled');

                  return (
                    <ModernTableRow key={appointment._id} isEven={index % 2 === 0}>
                      {/* Date & Time */}
                      <ModernTableCell>
                        <DateTimeDisplay 
                          date={appointment.date} 
                          time={appointment.timeSlot}
                        />
                      </ModernTableCell>
                      
                      {/* Doctor */}
                      <ModernTableCell>
                        <div className="flex items-center gap-3">
                          <Avatar 
                            name={appointment.doctorId?.name || 'Doctor'} 
                            size="sm"
                          />
                          <div>
                            <div className="font-bold text-text-primary text-sm">
                              Dr. {appointment.doctorId?.name || 'Doctor'}
                            </div>
                            <div className="text-xs text-text-muted">
                              {appointment.doctorId?.email || ''}
                            </div>
                          </div>
                        </div>
                      </ModernTableCell>
                      
                      {/* Status & Live Queue */}
                      <ModernTableCell>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            {isWaiting && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-500/15 text-green-600 dark:text-green-400 border border-green-500/30 animate-pulse">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                In Waiting Queue
                              </span>
                            )}
                            {isInProgress && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-primary border border-primary/30">
                                <span className="w-2 h-2 rounded-full bg-primary animate-ping"></span>
                                In Consultation Room
                              </span>
                            )}
                            {isDisputed && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                <FiAlertTriangle className="w-3.5 h-3.5" />
                                Dispute Under Review
                              </span>
                            )}
                            {!isWaiting && !isInProgress && !isDisputed && (
                              <StatusBadge status={appointment.status} type="appointment" />
                            )}
                          </div>
                          {appointment.checkedInAt && (
                            <span className="text-[11px] text-text-muted">
                              Checked in: {new Date(appointment.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      </ModernTableCell>

                      {/* Escrow Fee */}
                      <ModernTableCell>
                        <div className="text-xs space-y-0.5">
                          <div className="font-bold text-text-primary flex items-center gap-1">
                            <span>₹{((appointment.escrowAmount || 25000) / 100).toFixed(2)}</span>
                            <span className={`text-[10px] uppercase font-semibold px-1.5 py-0.2 rounded ${
                              appointment.escrowStatus === 'released_to_doctor' ? 'bg-green-500/10 text-green-600 dark:text-green-400' :
                              appointment.escrowStatus === 'refunded_to_patient' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400' :
                              appointment.escrowStatus === 'disputed' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                              'bg-blue-500/10 text-primary'
                            }`}>
                              {appointment.escrowStatus || 'held'}
                            </span>
                          </div>
                          <span className="text-[11px] text-text-muted">
                            {appointment.escrowStatus === 'held' ? 'Held in Secure Escrow' : 'Settled'}
                          </span>
                        </div>
                      </ModernTableCell>
                      
                      {/* Rating */}
                      <ModernTableCell>
                        {isCompleted && (
                          <div className="flex items-center gap-2">
                            {appointment.isRated ? (
                              <span className="text-xs text-green-600 dark:text-green-400 font-semibold flex items-center gap-1">
                                <FiCheck className="w-3.5 h-3.5" /> Rated
                              </span>
                            ) : (
                              <StarRating 
                                rating={ratingInputs[appointment._id] || 0}
                                onRate={(rating) => handleRating(appointment._id, rating)}
                                disabled={submittingId === appointment._id}
                                size="sm"
                              />
                            )}
                          </div>
                        )}
                      </ModernTableCell>
                      
                      {/* Actions */}
                      <ModernTableCell>
                        <div className="flex items-center gap-2">
                          {isScheduled && (
                            <>
                              <button
                                type="button"
                                onClick={() => setScannerAppt(appointment)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white hover:bg-primary-hover rounded-xl text-xs font-bold shadow-md transition-all animate-pulse"
                              >
                                <FiCamera className="w-3.5 h-3.5" />
                                Scan to Check-in
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setAppointmentToCancel(appointment);
                                  setShowCancelModal(true);
                                }}
                                className="px-2.5 py-1.5 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-xl text-xs font-semibold transition-colors"
                              >
                                Cancel
                              </button>
                            </>
                          )}

                          {isWaiting && (
                            <button
                              type="button"
                              onClick={() => setDisputeAppt(appointment)}
                              className="text-xs text-amber-600 dark:text-amber-400 hover:underline font-semibold flex items-center gap-1"
                            >
                              <FiAlertTriangle className="w-3.5 h-3.5" />
                              Report Issue
                            </button>
                          )}
                        </div>
                      </ModernTableCell>
                    </ModernTableRow>
                  );
                })}
              </tbody>
            </table>
          )}
        </ModernTableContainer>
      </div>

      {/* Mobile/Tablet Card View */}
      <div className="lg:hidden space-y-4">
        {list.length === 0 ? (
          <MobileCard>
            <EmptyState
              icon={<FiCalendar className="w-8 h-8 text-text-muted" />}
              title="No Appointments Scheduled"
              description="You don't have any appointments booked yet."
            />
          </MobileCard>
        ) : (
          list.map((appointment) => {
            const isScheduled = appointment.status === 'Scheduled';
            const isWaiting = appointment.status === 'Waiting';
            const isInProgress = appointment.status === 'In_Progress';
            const isDisputed = appointment.status === 'Disputed';
            const isCompleted = appointment.status === 'Completed';

            return (
              <MobileCard key={appointment._id}>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar 
                        name={appointment.doctorId?.name || 'Doctor'} 
                        size="md"
                      />
                      <div>
                        <h3 className="font-bold text-text-primary text-base">
                          Dr. {appointment.doctorId?.name || 'Doctor'}
                        </h3>
                        <p className="text-xs text-text-muted">
                          {appointment.doctorId?.email || ''}
                        </p>
                        <DateTimeDisplay 
                          date={appointment.date} 
                          time={appointment.timeSlot}
                        />
                      </div>
                    </div>
                    <div className="text-right">
                      {isWaiting ? (
                        <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold bg-green-500/15 text-green-600 dark:text-green-400 border border-green-500/30 animate-pulse">
                          In Waiting Queue
                        </span>
                      ) : isInProgress ? (
                        <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-primary border border-primary/30">
                          In Consultation
                        </span>
                      ) : isDisputed ? (
                        <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                          Disputed
                        </span>
                      ) : (
                        <StatusBadge status={appointment.status} type="appointment" />
                      )}
                    </div>
                  </div>

                  {/* Escrow Fee Card */}
                  <div className="flex items-center justify-between p-3 bg-bg-muted rounded-xl border border-border-subtle text-xs">
                    <div>
                      Escrow Fee: <span className="font-bold text-text-primary">₹{((appointment.escrowAmount || 25000) / 100).toFixed(2)}</span>
                    </div>
                    <span className="text-[11px] text-text-muted uppercase font-semibold">
                      {appointment.escrowStatus || 'held'}
                    </span>
                  </div>

                  {/* Dynamic Action Buttons */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-border-subtle">
                    {isScheduled && (
                      <>
                        <button
                          type="button"
                          onClick={() => setScannerAppt(appointment)}
                          className="flex-1 py-2.5 bg-primary text-white rounded-xl font-bold text-xs hover:bg-primary-hover shadow-md flex items-center justify-center gap-1.5 animate-pulse"
                        >
                          <FiCamera className="w-4 h-4" />
                          Scan to Check-in
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAppointmentToCancel(appointment);
                            setShowCancelModal(true);
                          }}
                          className="px-4 py-2.5 border border-border-subtle text-text-muted hover:text-red-500 rounded-xl text-xs font-semibold"
                        >
                          Cancel
                        </button>
                      </>
                    )}

                    {isWaiting && (
                      <button
                        type="button"
                        onClick={() => setDisputeAppt(appointment)}
                        className="w-full py-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5"
                      >
                        <FiAlertTriangle className="w-4 h-4" />
                        Trouble scanning or waiting too long? Report Issue
                      </button>
                    )}
                  </div>
                </div>
              </MobileCard>
            );
          })
        )}
      </div>

      {/* QR Scanner Modal */}
      {scannerAppt && (
        <PatientScannerModal
          open={Boolean(scannerAppt)}
          appointment={scannerAppt}
          onClose={() => setScannerAppt(null)}
          onSuccess={() => load(false)}
          onOpenDispute={(appt) => {
            setScannerAppt(null);
            setDisputeAppt(appt);
          }}
        />
      )}

      {/* Dispute Reporting Modal */}
      {disputeAppt && (
        <DisputeModal
          open={Boolean(disputeAppt)}
          appointment={disputeAppt}
          onClose={() => setDisputeAppt(null)}
          onSuccess={() => load(false)}
        />
      )}

      {/* Cancellation & 24h Escrow Refund Policy Modal */}
      {showCancelModal && appointmentToCancel && (
        <div className="fixed inset-0 z-[1300] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative z-[1301] w-full max-w-md bg-bg-card text-text-primary rounded-3xl shadow-2xl border border-border-subtle overflow-hidden animate-fade-in-fast">
            <div className="px-6 py-5 border-b border-border-subtle bg-bg-muted flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center">
                  <FiAlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-text-primary">Cancel Appointment</h3>
                  <p className="text-xs text-text-muted">24-Hour Escrow Refund Policy</p>
                </div>
              </div>
              <button
                onClick={() => setShowCancelModal(false)}
                className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-bg-card-hover transition-colors"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {(() => {
                const policy = evaluateCancellationPolicy(appointmentToCancel);
                return (
                  <div className={`p-4 rounded-2xl border text-xs leading-relaxed ${
                    policy.isFullRefund 
                      ? 'bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-300' 
                      : 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300'
                  }`}>
                    {policy.isFullRefund ? (
                      <>
                        <span className="font-bold block mb-1">✅ 100% Full Refund Guaranteed</span>
                        You are cancelling more than 24 hours prior to the appointment. Your held escrow fee of ₹{((appointmentToCancel.escrowAmount || 25000) / 100).toFixed(2)} will be refunded to your account immediately.
                      </>
                    ) : (
                      <>
                        <span className="font-bold block mb-1">⚠️ Late Cancellation Policy Notice</span>
                        You are cancelling less than 24 hours prior to the appointment slot ({policy.diffHours.toFixed(1)}h remaining). A late cancellation policy will apply to compensate the doctor's reserved schedule.
                      </>
                    )}
                  </div>
                );
              })()}

              <p className="text-xs text-text-secondary">
                Are you sure you want to proceed with cancelling your appointment with Dr. {appointmentToCancel.doctorId?.name || 'Doctor'}?
              </p>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 py-3 border border-border-subtle rounded-2xl text-text-secondary font-semibold text-xs hover:bg-bg-card-hover transition-colors"
                >
                  Keep Appointment
                </button>
                <button
                  type="button"
                  onClick={handleCancelAppointment}
                  disabled={cancellingId === appointmentToCancel._id}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold text-xs shadow-md transition-all disabled:opacity-50"
                >
                  {cancellingId === appointmentToCancel._id ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}