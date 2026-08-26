import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiCalendar, FiUser, FiActivity, FiFileText, FiCheckCircle, 
  FiClock, FiEdit3, FiDollarSign, FiXCircle, FiAlertTriangle, 
  FiRefreshCw, FiPlay, FiCheck, FiShield, FiKey, FiEye
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useSocket } from '../../contexts/SocketContext';
import DoctorQRModal from '../../components/appointments/DoctorQRModal';
import {
  ModernTableContainer,
  ModernTableHeader,
  ModernTableRow,
  ModernTableCell,
  StatusBadge,
  DateTimeDisplay,
  Avatar,
  ActionButton,
  EmptyState,
  LoadingState,
  MobileCard
} from '../../components/ui';
import { AppointmentSkeleton } from '../../components/ui/SkeletonLoader';

export default function DoctorAppointments() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  
  // Modals state
  const [qrModalAppointment, setQrModalAppointment] = useState(null);
  const [completeModalAppt, setCompleteModalAppt] = useState(null);
  const [consultationNotes, setConsultationNotes] = useState('');
  const [noMedicationRequired, setNoMedicationRequired] = useState(false);
  const [counterDisputeAppt, setCounterDisputeAppt] = useState(null);
  const [doctorCounterNotes, setDoctorCounterNotes] = useState('');
  
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rescheduleData, setRescheduleData] = useState({ newDate: '', newTimeSlot: '', reason: '' });
  
  const navigate = useNavigate();
  const { socket } = useSocket();

  const load = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const res = await api.get('/doctors/appointments');
      setList(res.data.data || []);
    } catch (err) {
      console.error('Error loading doctor appointments:', err);
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

    const handleWaiting = (data) => {
      toast.success(`🛎️ ${data.patientName} has checked in and is waiting in clinic!`, {
        duration: 7000,
        icon: '🟢',
      });
      load(false);
    };

    const handleUpdated = () => {
      load(false);
    };

    const handleDisputed = (data) => {
      toast.error(`⚠️ Dispute reported on appointment #${data.appointmentId?.slice(-6)}: "${data.reason}"`, {
        duration: 8000,
      });
      load(false);
    };

    const handleResolved = () => {
      toast.success('Dispute ruling updated by admin.');
      load(false);
    };

    socket.on('appointment:waiting', handleWaiting);
    socket.on('appointment:updated', handleUpdated);
    socket.on('appointment:disputed', handleDisputed);
    socket.on('dispute:resolved', handleResolved);

    return () => {
      socket.off('appointment:waiting', handleWaiting);
      socket.off('appointment:updated', handleUpdated);
      socket.off('appointment:disputed', handleDisputed);
      socket.off('dispute:resolved', handleResolved);
    };
  }, [socket, load]);

  // Start Consultation (Waiting -> In_Progress)
  const handleStartConsultation = async (id) => {
    setUpdatingId(id);
    const toastId = toast.loading('Starting consultation...');
    try {
      const res = await api.post(`/appointments/${id}/start`);
      if (res.data?.success) {
        toast.dismiss(toastId);
        toast.success('Consultation started! Status updated to In Progress.');
        await load(false);
      }
    } catch (err) {
      toast.dismiss(toastId);
      toast.error(err.response?.data?.message || 'Failed to start consultation');
    } finally {
      setUpdatingId(null);
    }
  };

  // Complete Consultation with QC Enforcement
  const handleCompleteConsultation = async (e) => {
    e.preventDefault();
    if (!completeModalAppt) return;

    if (!consultationNotes.trim() && !noMedicationRequired) {
      toast.error('Quality Control: Please provide consultation notes, create a prescription, or mark "No medication required".');
      return;
    }

    setUpdatingId(completeModalAppt._id);
    const toastId = toast.loading('Verifying Quality Control & settling escrow...');
    try {
      const res = await api.post(`/appointments/${completeModalAppt._id}/complete`, {
        consultationNotes: consultationNotes.trim(),
        no_medication_required: noMedicationRequired,
      });

      if (res.data?.success) {
        toast.dismiss(toastId);
        toast.success('Consultation completed! Escrow funds released to doctor account.');
        setCompleteModalAppt(null);
        setConsultationNotes('');
        setNoMedicationRequired(false);
        await load(false);
      }
    } catch (err) {
      toast.dismiss(toastId);
      toast.error(err.response?.data?.message || 'Failed to complete consultation');
    } finally {
      setUpdatingId(null);
    }
  };

  // Doctor Dispute Response: Accept Fault & Refund
  const handleAcceptFault = async (id) => {
    if (!confirm('Are you sure you want to accept fault and issue an instant full refund to the patient?')) {
      return;
    }
    setUpdatingId(id);
    const toastId = toast.loading('Processing patient refund...');
    try {
      const res = await api.post(`/appointments/${id}/doctor-dispute-response`, {
        action: 'accept_fault',
        doctorNotes: 'Doctor accepted fault for check-in / availability issue',
      });
      if (res.data?.success) {
        toast.dismiss(toastId);
        toast.success('Dispute resolved. Full refund issued to patient.');
        await load(false);
      }
    } catch (err) {
      toast.dismiss(toastId);
      toast.error(err.response?.data?.message || 'Failed to process dispute response');
    } finally {
      setUpdatingId(null);
    }
  };

  // Doctor Dispute Response: Counter-Dispute
  const handleCounterDispute = async (e) => {
    e.preventDefault();
    if (!counterDisputeAppt) return;

    setUpdatingId(counterDisputeAppt._id);
    const toastId = toast.loading('Submitting counter-dispute to admin ledger...');
    try {
      const res = await api.post(`/appointments/${counterDisputeAppt._id}/doctor-dispute-response`, {
        action: 'counter_dispute',
        doctorNotes: doctorCounterNotes.trim() || 'Doctor contested dispute claim with clinic logs',
      });
      if (res.data?.success) {
        toast.dismiss(toastId);
        toast.success('Counter-dispute recorded. Case escalated to Admin Dispute Ledger.');
        setCounterDisputeAppt(null);
        setDoctorCounterNotes('');
        await load(false);
      }
    } catch (err) {
      toast.dismiss(toastId);
      toast.error(err.response?.data?.message || 'Failed to submit counter-dispute');
    } finally {
      setUpdatingId(null);
    }
  };

  const updateApptNotes = async (id, notes) => {
    try {
      await api.put(`/doctors/appointments/${id}`, { notes });
    } catch (err) {
      toast.error('Failed to save notes');
    }
  };

  const columns = [
    { label: 'Date & Time', icon: <FiCalendar className="w-4 h-4 text-primary" /> },
    { label: 'Patient', icon: <FiUser className="w-4 h-4 text-teal-500" /> },
    { label: 'Pipeline Status', icon: <FiActivity className="w-4 h-4 text-green-500" /> },
    { label: 'Escrow & Check-In', icon: <FiDollarSign className="w-4 h-4 text-amber-500" /> },
    { label: 'Actions', icon: <FiEdit3 className="w-4 h-4 text-purple-500" /> }
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-1">Appointment Pipeline</h1>
          <p className="text-text-secondary text-sm">Real-time check-in tracking, dynamic consultations, and escrow ledger</p>
        </div>
        <div className="hidden lg:block">
          <ModernTableContainer>
            <AppointmentSkeleton count={5} />
          </ModernTableContainer>
        </div>
        <div className="lg:hidden space-y-4">
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
          <h1 className="text-3xl font-bold text-text-primary mb-1">Appointment Pipeline</h1>
          <p className="text-text-secondary text-sm">Real-time QR check-in, live queue state, and escrow financial pipeline</p>
        </div>
        <button
          onClick={() => load()}
          className="self-start flex items-center gap-2 px-4 py-2 bg-bg-card hover:bg-bg-card-hover border border-border-subtle rounded-xl text-text-primary font-semibold text-xs transition-colors shadow-sm"
        >
          <FiRefreshCw className="w-3.5 h-3.5" />
          Refresh Pipeline
        </button>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block">
        <ModernTableContainer
          title="Appointment Queue & Consultations"
          subtitle={`${list.length} appointment${list.length !== 1 ? 's' : ''} total`}
        >
          {list.length === 0 ? (
            <EmptyState
              icon={<FiCalendar className="w-8 h-8 text-text-muted" />}
              title="No Appointments Scheduled"
              description="You don't have any appointments yet. They will appear here when patients book with you."
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

                  return (
                    <ModernTableRow key={appointment._id} isEven={index % 2 === 0}>
                      {/* Date & Time */}
                      <ModernTableCell>
                        <DateTimeDisplay 
                          date={appointment.date} 
                          time={appointment.timeSlot}
                        />
                      </ModernTableCell>
                      
                      {/* Patient */}
                      <ModernTableCell>
                        <div className="flex items-center gap-3">
                          <Avatar 
                            name={appointment.patientId?.name || 'Unknown Patient'} 
                            size="sm"
                          />
                          <div>
                            <div className="font-bold text-text-primary text-sm">
                              {appointment.patientId?.name || 'Unknown Patient'}
                            </div>
                            <div className="text-xs text-text-muted">
                              {appointment.patientId?.email || 'No email'}
                            </div>
                          </div>
                        </div>
                      </ModernTableCell>
                      
                      {/* Status */}
                      <ModernTableCell>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            {isWaiting && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-500/15 text-green-600 dark:text-green-400 border border-green-500/30 animate-pulse">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                Waiting in Clinic
                              </span>
                            )}
                            {isInProgress && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-primary border border-primary/30">
                                <span className="w-2 h-2 rounded-full bg-primary animate-ping"></span>
                                In Progress
                              </span>
                            )}
                            {isDisputed && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                <FiAlertTriangle className="w-3.5 h-3.5" />
                                Disputed
                              </span>
                            )}
                            {!isWaiting && !isInProgress && !isDisputed && (
                              <StatusBadge status={appointment.status} type="appointment" />
                            )}
                          </div>
                          {appointment.checkedInAt && (
                            <span className="text-[11px] text-text-muted">
                              Checked in: {new Date(appointment.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              {appointment.manual_bypass && ' (PIN)'}
                            </span>
                          )}
                        </div>
                      </ModernTableCell>

                      {/* Escrow & Check-in */}
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
                          <div className="text-text-muted font-mono text-[11px]">
                            PIN: <span className="font-bold text-text-primary">{appointment.offlinePin || '------'}</span>
                          </div>
                        </div>
                      </ModernTableCell>
                      
                      {/* Dynamic Action Pipeline */}
                      <ModernTableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          {/* 1. Scheduled State -> Show QR Button */}
                          {isScheduled && (
                            <button
                              type="button"
                              onClick={() => setQrModalAppointment(appointment)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white hover:bg-primary-hover rounded-xl text-xs font-bold shadow-sm transition-all"
                            >
                              <FiShield className="w-3.5 h-3.5" />
                              Show QR
                            </button>
                          )}

                          {/* 2. Waiting State -> Start Consultation Button */}
                          {isWaiting && (
                            <button
                              type="button"
                              onClick={() => handleStartConsultation(appointment._id)}
                              disabled={updatingId === appointment._id}
                              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold shadow-md transition-all animate-pulse"
                            >
                              <FiPlay className="w-3.5 h-3.5" />
                              Start Consultation
                            </button>
                          )}

                          {/* 3. In Progress State -> Complete & Prescribe */}
                          {isInProgress && (
                            <button
                              type="button"
                              onClick={() => {
                                setCompleteModalAppt(appointment);
                                setConsultationNotes(appointment.notes || '');
                              }}
                              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold shadow-md transition-all"
                            >
                              <FiCheckCircle className="w-3.5 h-3.5" />
                              Complete & Prescribe
                            </button>
                          )}

                          {/* 4. Disputed State -> Actions */}
                          {isDisputed && (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleAcceptFault(appointment._id)}
                                className="px-2.5 py-1 bg-red-500/15 text-red-600 dark:text-red-400 hover:bg-red-500/25 border border-red-500/30 rounded-lg text-xs font-bold transition-colors"
                                title="Accept fault and refund patient"
                              >
                                Accept & Refund
                              </button>
                              <button
                                type="button"
                                onClick={() => setCounterDisputeAppt(appointment)}
                                className="px-2.5 py-1 bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 border border-amber-500/30 rounded-lg text-xs font-bold transition-colors"
                                title="Counter dispute to admin"
                              >
                                Counter
                              </button>
                            </div>
                          )}

                          {/* 5. Completed State -> View Prescription / Bill */}
                          {isCompleted && (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => navigate('/doctor/prescriptions/new', { 
                                  state: { 
                                    patientId: appointment.patientId?._id, 
                                    appointmentId: appointment._id 
                                  } 
                                })}
                                className="px-3 py-1.5 bg-bg-card hover:bg-bg-card-hover text-text-primary border border-border-subtle rounded-xl text-xs font-semibold shadow-sm transition-colors"
                              >
                                Prescribe
                              </button>
                              {appointment.finalBillGenerated && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    try {
                                      const res = await api.get('/bills/doctor', { 
                                        params: { appointmentId: appointment._id } 
                                      });
                                      if (res.data.data && res.data.data.length > 0) {
                                        navigate(`/doctor/bills/${res.data.data[0]._id}`);
                                      }
                                    } catch (err) {
                                      toast.error('Bill not found');
                                    }
                                  }}
                                  className="p-1.5 bg-bg-card hover:bg-bg-card-hover text-text-secondary border border-border-subtle rounded-xl transition-colors"
                                  title="View Bill"
                                >
                                  <FiDollarSign className="w-4 h-4" />
                                </button>
                              )}
                            </div>
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
              description="You don't have any appointments yet."
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
                  {/* Top Bar */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar 
                        name={appointment.patientId?.name || 'Unknown Patient'} 
                        size="md"
                      />
                      <div>
                        <h3 className="font-bold text-text-primary text-base">
                          {appointment.patientId?.name || 'Unknown Patient'}
                        </h3>
                        <p className="text-xs text-text-muted">
                          {appointment.patientId?.email || 'No email'}
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
                          Waiting in Clinic
                        </span>
                      ) : isInProgress ? (
                        <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-primary border border-primary/30">
                          In Progress
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

                  {/* Escrow & Offline PIN Bar */}
                  <div className="flex items-center justify-between p-3 bg-bg-muted rounded-xl border border-border-subtle text-xs">
                    <div className="text-text-secondary">
                      Escrow: <span className="font-bold text-text-primary">₹{((appointment.escrowAmount || 25000) / 100).toFixed(2)}</span> ({appointment.escrowStatus || 'held'})
                    </div>
                    <div className="font-mono text-text-primary font-bold">
                      PIN: {appointment.offlinePin || '------'}
                    </div>
                  </div>

                  {/* Dispute Banner if disputed */}
                  {isDisputed && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs">
                      <div className="font-bold text-amber-600 dark:text-amber-400 mb-1 flex items-center gap-1.5">
                        <FiAlertTriangle className="w-4 h-4" />
                        Patient Dispute Reported
                      </div>
                      <p className="text-text-secondary italic mb-3">"{appointment.dispute?.reason || 'Issue reported'}"</p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleAcceptFault(appointment._id)}
                          className="flex-1 py-1.5 bg-red-600 text-white rounded-lg font-bold text-xs shadow-sm"
                        >
                          Accept & Refund
                        </button>
                        <button
                          type="button"
                          onClick={() => setCounterDisputeAppt(appointment)}
                          className="flex-1 py-1.5 bg-amber-600 text-white rounded-lg font-bold text-xs shadow-sm"
                        >
                          Counter Dispute
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Dynamic Action Pipeline Buttons */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-border-subtle">
                    {isScheduled && (
                      <button
                        type="button"
                        onClick={() => setQrModalAppointment(appointment)}
                        className="flex-1 py-2.5 bg-primary text-white rounded-xl font-bold text-xs hover:bg-primary-hover shadow-md flex items-center justify-center gap-1.5"
                      >
                        <FiShield className="w-4 h-4" />
                        Show QR Code
                      </button>
                    )}

                    {isWaiting && (
                      <button
                        type="button"
                        onClick={() => handleStartConsultation(appointment._id)}
                        disabled={updatingId === appointment._id}
                        className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-xs shadow-md flex items-center justify-center gap-1.5"
                      >
                        <FiPlay className="w-4 h-4" />
                        Start Consultation
                      </button>
                    )}

                    {isInProgress && (
                      <button
                        type="button"
                        onClick={() => {
                          setCompleteModalAppt(appointment);
                          setConsultationNotes(appointment.notes || '');
                        }}
                        className="flex-1 py-2.5 bg-primary text-white rounded-xl font-bold text-xs hover:bg-primary-hover shadow-md flex items-center justify-center gap-1.5"
                      >
                        <FiCheckCircle className="w-4 h-4" />
                        Complete & Prescribe
                      </button>
                    )}

                    {isCompleted && (
                      <button
                        type="button"
                        onClick={() => navigate('/doctor/prescriptions/new', { 
                          state: { 
                            patientId: appointment.patientId?._id, 
                            appointmentId: appointment._id 
                          } 
                        })}
                        className="flex-1 py-2 bg-bg-muted hover:bg-bg-card-hover text-text-primary border border-border-subtle rounded-xl font-semibold text-xs"
                      >
                        Create / Edit Prescription
                      </button>
                    )}
                  </div>
                </div>
              </MobileCard>
            );
          })
        )}
      </div>

      {/* Rolling QR Code Modal */}
      {qrModalAppointment && (
        <DoctorQRModal
          open={Boolean(qrModalAppointment)}
          appointment={qrModalAppointment}
          onClose={() => setQrModalAppointment(null)}
        />
      )}

      {/* Consultation Quality Control Completion Modal */}
      {completeModalAppt && (
        <div className="fixed inset-0 z-[1300] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative z-[1301] w-full max-w-lg bg-bg-card text-text-primary rounded-3xl shadow-2xl border border-border-subtle overflow-hidden animate-fade-in-fast">
            <div className="px-6 py-5 border-b border-border-subtle bg-bg-muted flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  <FiCheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-text-primary">Complete Consultation</h3>
                  <p className="text-xs text-text-muted">Quality Control & Escrow Settlement</p>
                </div>
              </div>
              <button
                onClick={() => setCompleteModalAppt(null)}
                className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-bg-card-hover transition-colors"
              >
                <FiXCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCompleteConsultation} className="p-6 space-y-5">
              <div className="p-4 bg-primary-subtle border border-primary-border rounded-2xl text-xs text-text-secondary">
                <span className="font-bold text-primary block mb-1">Quality Control Policy</span>
                To guarantee clinical care standards before releasing the escrow fee of ₹{((completeModalAppt.escrowAmount || 25000) / 100).toFixed(2)}, please provide clinical consultation notes or confirm no prescription was required.
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">
                  Clinical Consultation Notes
                </label>
                <textarea
                  rows={4}
                  value={consultationNotes}
                  onChange={(e) => setConsultationNotes(e.target.value)}
                  placeholder="Enter patient diagnosis, findings, recommended care, or follow-up instructions..."
                  className="w-full px-4 py-3 bg-bg-input text-text-primary border border-border-subtle rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-xs"
                />
              </div>

              <div className="flex items-center gap-3 p-3 bg-bg-muted border border-border-subtle rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  id="noMed"
                  checked={noMedicationRequired}
                  onChange={(e) => setNoMedicationRequired(e.target.checked)}
                  className="w-4 h-4 text-primary rounded focus:ring-primary"
                />
                <label htmlFor="noMed" className="text-xs text-text-primary font-medium cursor-pointer">
                  No medication / prescription required for this consultation
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const appt = completeModalAppt;
                    setCompleteModalAppt(null);
                    navigate('/doctor/prescriptions/new', {
                      state: {
                        patientId: appt.patientId?._id || appt.patientId,
                        appointmentId: appt._id,
                      },
                    });
                  }}
                  className="flex-1 py-3 bg-bg-card hover:bg-bg-card-hover border border-border-subtle text-text-primary rounded-2xl font-bold text-xs transition-colors shadow-sm"
                >
                  Write Prescription First
                </button>
                <button
                  type="submit"
                  disabled={updatingId === completeModalAppt._id}
                  className="flex-1 py-3 bg-primary hover:bg-primary-hover text-white rounded-2xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <FiCheck className="w-4 h-4" />
                  Complete & Settle Escrow
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Counter Dispute Modal */}
      {counterDisputeAppt && (
        <div className="fixed inset-0 z-[1300] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative z-[1301] w-full max-w-lg bg-bg-card text-text-primary rounded-3xl shadow-2xl border border-border-subtle overflow-hidden animate-fade-in-fast">
            <div className="px-6 py-5 border-b border-border-subtle bg-amber-500/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <FiAlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-amber-600 dark:text-amber-400">Counter Dispute</h3>
                  <p className="text-xs text-text-muted">Escalate to Admin Dispute Ledger</p>
                </div>
              </div>
              <button
                onClick={() => setCounterDisputeAppt(null)}
                className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-bg-card-hover transition-colors"
              >
                <FiXCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCounterDispute} className="p-6 space-y-5">
              <div className="p-4 bg-bg-muted rounded-2xl border border-border-subtle text-xs text-text-secondary">
                <span className="font-bold text-text-primary block mb-1">Patient's Claim:</span>
                "{counterDisputeAppt.dispute?.reason || 'Check-in issue reported'}"
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">
                  Doctor's Counter Explanation / Clinic Evidence
                </label>
                <textarea
                  rows={4}
                  required
                  value={doctorCounterNotes}
                  onChange={(e) => setDoctorCounterNotes(e.target.value)}
                  placeholder="Explain your side (e.g., Doctor was present, QR code was active, patient arrived late, etc.)..."
                  className="w-full px-4 py-3 bg-bg-input text-text-primary border border-border-subtle rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-xs"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCounterDisputeAppt(null)}
                  className="flex-1 py-3 border border-border-subtle rounded-2xl text-text-secondary font-semibold text-xs hover:bg-bg-card-hover transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingId === counterDisputeAppt._id}
                  className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl font-bold text-xs shadow-md transition-all disabled:opacity-50"
                >
                  Submit Counter-Dispute
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}