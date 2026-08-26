import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { FiCalendar, FiClock, FiMapPin, FiSearch, FiX, FiCheck } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { KERALA_DISTRICTS } from '../../constants';
import { AppSelect, Calendar, DoctorProfileModal } from '../../components/ui';

export default function BookAppointment() {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]);
  const [specializations, setSpecializations] = useState([]);
  const [selectedSpecId, setSelectedSpecId] = useState(null);
  const [filterDistrict, setFilterDistrict] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [profileDoctor, setProfileDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [availableDates, setAvailableDates] = useState([]);
  const [loadingDates, setLoadingDates] = useState(false);
  const [form, setForm] = useState({ date: '', timeSlot: '' });

  // Today's date in YYYY-MM-DD
  const todayIsoDate = useMemo(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [specRes] = await Promise.all([
          api.get('/specializations'),
        ]);
        setSpecializations(specRes.data.data || []);
      } catch {
        toast.error('Failed to load initial specializations');
      }
    })();
  }, []);

  // Fetch doctors based on filters
  useEffect(() => {
    const fetchDoctors = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (selectedSpecId) params.append('specializationId', selectedSpecId);
        if (filterDistrict) params.append('district', filterDistrict);
        if (searchQuery.trim()) params.append('search', searchQuery.trim());
        
        let docRes;
        try {
          docRes = await api.get(`/doctors?${params.toString()}`);
        } catch {
          docRes = await api.get(`/patients/doctors?${params.toString()}`);
        }
        setDoctors(docRes.data.data || []);
      } catch (err) {
        console.error('Error loading doctors:', err);
        toast.error('Failed to load doctors');
      } finally {
        setLoading(false);
      }
    };

    fetchDoctors();
  }, [selectedSpecId, filterDistrict, searchQuery]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDoctor || !form.date || !form.timeSlot) {
      toast.error('Please select doctor, date and time slot');
      return;
    }
    setBooking(true);
    const toastId = toast.loading('Securing appointment with escrow hold...');
    try {
      const res = await api.post('/patients/appointments', {
        doctorId: selectedDoctor.userId._id,
        date: form.date,
        timeSlot: form.timeSlot,
      });

      toast.dismiss(toastId);
      if (res.data?.success) {
        toast.success('Appointment booked successfully! Escrow fee held safely.');
        navigate('/patient/appointments');
      } else {
        toast.error(res.data?.message || 'Failed to book appointment');
        setBooking(false);
      }
    } catch (e) {
      toast.dismiss(toastId);
      toast.error(e?.response?.data?.message || 'Failed to book appointment');
      setBooking(false);
    }
  };

  const handleDateSelect = (dateStr) => {
    setForm(prev => ({ ...prev, date: dateStr, timeSlot: '' }));
  };

  const handleCalendarMonthChange = (newMonth) => {
    if (selectedDoctor) {
      fetchAvailableDatesForMonth(selectedDoctor, newMonth);
    }
  };

  const fetchAvailableDatesForMonth = async (doctor, monthDate) => {
    setLoadingDates(true);
    try {
      const targetDate = monthDate || new Date();
      const monthStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
      const res = await api.get(`/doctors/${doctor.userId._id}/available-dates?month=${monthStr}`);
      setAvailableDates(res.data?.data || []);
    } catch {
      setAvailableDates([]);
    } finally {
      setLoadingDates(false);
    }
  };

  useEffect(() => {
    if (selectedDoctor) {
      fetchAvailableDatesForMonth(selectedDoctor, new Date());
    } else {
      setAvailableDates([]);
    }
  }, [selectedDoctor]);

  const filteredAndSortedSlots = useMemo(() => {
    if (!availableSlots.length || !form.date) return [];
    
    const parseTime = (timeStr) => {
      const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
      if (!match) return 0;
      let [, hours, minutes, period] = match;
      hours = parseInt(hours, 10);
      minutes = parseInt(minutes, 10);
      if (period) {
        if (period.toUpperCase() === 'PM' && hours !== 12) hours += 12;
        if (period.toUpperCase() === 'AM' && hours === 12) hours = 0;
      }
      return hours * 60 + minutes;
    };

    return [...availableSlots].sort((a, b) => {
      const timeA = a.split('-')[0].trim();
      const timeB = b.split('-')[0].trim();
      return parseTime(timeA) - parseTime(timeB);
    });
  }, [availableSlots, form.date]);

  useEffect(() => {
    const fetchAvailableSlots = async () => {
      if (!selectedDoctor || !form.date) {
        setAvailableSlots([]);
        return;
      }
      setLoadingSlots(true);
      try {
        const res = await api.get(`/doctors/${selectedDoctor.userId._id}/available-slots?date=${form.date}`);
        setAvailableSlots(res.data?.data || []);
      } catch {
        setAvailableSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchAvailableSlots();
  }, [selectedDoctor, form.date]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary">Find Your Doctor</h1>
        <p className="text-text-secondary">Book your next appointment with ease.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Filters */}
        <div className="md:col-span-1 bg-bg-card p-5 rounded-2xl shadow-card border border-border-subtle space-y-4 self-start">
          <h2 className="font-bold text-text-primary border-b border-border-subtle pb-3 text-base">Filters</h2>

          {/* District Dropdown */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">District</label>
            <AppSelect
              value={filterDistrict}
              onChange={(val) => setFilterDistrict(typeof val === 'object' && val?.target ? val.target.value : (val || ''))}
              placeholder="All Districts"
              options={[
                { value: '', label: 'All Districts' },
                ...KERALA_DISTRICTS.map((d) => ({ value: d, label: d }))
              ]}
              icon={<FiMapPin className="text-text-muted" />}
            />
          </div>

          {/* Specializations List */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary block">Specialization</label>
            <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
              <button
                type="button"
                onClick={() => setSelectedSpecId(null)}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  !selectedSpecId
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-text-secondary hover:bg-bg-muted hover:text-text-primary'
                }`}
              >
                All
              </button>
              {specializations.map((spec) => (
                <button
                  key={spec._id}
                  type="button"
                  onClick={() => setSelectedSpecId(spec._id)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    selectedSpecId === spec._id
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-text-secondary hover:bg-bg-muted hover:text-text-primary'
                  }`}
                >
                  {spec.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Doctor List & Search */}
        <div className="md:col-span-3 space-y-4">
          {/* Search bar */}
          <div className="relative">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search doctors by name..."
              className="w-full pl-12 pr-4 py-3.5 bg-bg-card text-text-primary border border-border-subtle rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm shadow-sm transition-all"
            />
          </div>

          {/* Doctors Grid */}
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 bg-bg-card rounded-2xl border border-border-subtle space-y-3">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-text-muted">Loading qualified doctors...</p>
            </div>
          ) : doctors.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-bg-card rounded-2xl border border-border-subtle text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-bg-muted flex items-center justify-center text-text-muted">
                <FiSearch className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-text-primary">No doctors found for your selected filters.</h3>
              <p className="text-xs text-text-muted max-w-sm">
                Try selecting "All Districts" or clearing your specialization filter to see more results.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {doctors.map((doctor) => (
                <div
                  key={doctor._id}
                  className="bg-bg-card p-5 rounded-2xl shadow-card border border-border-subtle space-y-4 flex flex-col justify-between hover:border-primary/40 transition-all group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary font-black text-lg flex items-center justify-center flex-shrink-0">
                        {doctor.userId?.name?.charAt(0) || 'D'}
                      </div>
                      <div>
                        <h3 className="font-bold text-text-primary text-base group-hover:text-primary transition-colors">
                          Dr. {doctor.userId?.name}
                        </h3>
                        <p className="text-xs text-primary font-semibold">
                          {doctor.specializationId?.name || 'General Physician'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs text-text-secondary">
                      <p className="flex items-center gap-1.5">
                        <FiMapPin className="w-3.5 h-3.5 text-text-muted" />
                        {doctor.hospitalId?.name || 'Private Clinic'}, {doctor.district}
                      </p>
                      <p className="text-text-muted text-[11px]">
                        Fee: ₹{((doctor.consultationFee || 25000) / 100).toFixed(2)} (Escrow Held)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-border-subtle">
                    <button
                      type="button"
                      onClick={() => setProfileDoctor(doctor)}
                      className="flex-1 py-2 px-3 bg-bg-muted hover:bg-bg-card-hover border border-border-subtle rounded-xl text-xs font-semibold text-text-primary transition-colors"
                    >
                      View Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDoctor(doctor);
                        setForm({ date: todayIsoDate, timeSlot: '' });
                      }}
                      className="flex-1 py-2 px-3 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
                    >
                      Book Slot
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Booking Drawer / Modal */}
      {selectedDoctor && (
        <div className="fixed inset-0 z-[1300] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative z-[1301] w-full max-w-lg bg-bg-card text-text-primary rounded-3xl shadow-2xl border border-border-subtle overflow-hidden animate-fade-in-fast">
            <div className="px-6 py-5 border-b border-border-subtle bg-bg-muted flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-text-primary">Book Appointment</h3>
                <p className="text-xs text-text-muted">Dr. {selectedDoctor.userId?.name}</p>
              </div>
              <button
                onClick={() => setSelectedDoctor(null)}
                className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-bg-card-hover transition-colors"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={onSubmit} className="p-6 space-y-5">
              {/* Date selection */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">
                  Select Date
                </label>
                <input
                  type="date"
                  min={todayIsoDate}
                  value={form.date}
                  onChange={(e) => handleDateSelect(e.target.value)}
                  className="w-full px-4 py-2.5 bg-bg-input text-text-primary border border-border-subtle rounded-xl text-xs focus:outline-none focus:border-primary"
                  required
                />
              </div>

              {/* Time Slot Selection */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">
                  Select Available Time Slot
                </label>
                {loadingSlots ? (
                  <div className="p-4 text-center text-xs text-text-muted">Loading available slots...</div>
                ) : filteredAndSortedSlots.length === 0 ? (
                  <div className="p-4 bg-bg-muted rounded-xl text-center text-xs text-text-muted border border-border-subtle">
                    No available slots for this date. Please choose another date.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                    {filteredAndSortedSlots.map((slot, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, timeSlot: slot }))}
                        className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all ${
                          form.timeSlot === slot
                            ? 'bg-primary text-white border-primary shadow-sm'
                            : 'bg-bg-muted border-border-subtle text-text-secondary hover:bg-bg-card-hover hover:text-text-primary'
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-3.5 bg-primary-subtle border border-primary-border rounded-xl text-xs text-text-secondary">
                <span className="font-bold text-primary block mb-0.5">Escrow Protection</span>
                Your fee of ₹{((selectedDoctor.consultationFee || 25000) / 100).toFixed(2)} is held in escrow until the doctor completes the consultation.
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedDoctor(null)}
                  className="flex-1 py-3 border border-border-subtle rounded-2xl text-text-secondary font-semibold text-xs hover:bg-bg-card-hover transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={booking || !form.date || !form.timeSlot}
                  className="flex-1 py-3 bg-primary hover:bg-primary-hover text-white rounded-2xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {booking ? 'Securing Slot...' : 'Confirm & Book Slot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Doctor Profile Modal */}
      {profileDoctor && (
        <DoctorProfileModal
          open={Boolean(profileDoctor)}
          doctor={profileDoctor}
          onClose={() => setProfileDoctor(null)}
          onBookAppointment={(doc) => {
            setProfileDoctor(null);
            setSelectedDoctor(doc);
            setForm({ date: todayIsoDate, timeSlot: '' });
          }}
        />
      )}
    </div>
  );
}