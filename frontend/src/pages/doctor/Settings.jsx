import { useEffect, useState } from 'react';
import { FiSave, FiDollarSign, FiUser, FiMapPin, FiHome } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../services/api';

export default function DoctorSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState({
    consultationFee: '',
    bio: '',
    qualifications: '',
    experienceYears: '',
    location: '',
    district: '',
    languages: []
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await api.get('/doctors/profile');
      const data = response.data.data;
      setProfile(data);
      
      // Convert consultation fee from paise to rupees for display
      setFormData({
        consultationFee: data.consultationFee ? (data.consultationFee / 100).toFixed(2) : '250.00',
        bio: data.bio || '',
        qualifications: data.qualifications || '',
        experienceYears: data.experienceYears || '',
        location: data.location || '',
        district: data.district || '',
        languages: data.languages || []
      });
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate consultation fee
    const feeInRupees = parseFloat(formData.consultationFee);
    if (isNaN(feeInRupees) || feeInRupees < 0) {
      toast.error('Please enter a valid consultation fee');
      return;
    }

    setSaving(true);
    try {
      // Convert rupees to paise before sending
      const feeInPaise = Math.round(feeInRupees * 100);
      
      const updateData = {
        consultationFee: feeInPaise,
        bio: formData.bio,
        qualifications: formData.qualifications,
        experienceYears: formData.experienceYears ? parseInt(formData.experienceYears) : undefined,
        location: formData.location,
        district: formData.district,
        languages: formData.languages
      };

      await api.put('/doctors/profile', updateData);
      toast.success('Profile updated successfully!');
      loadProfile(); // Reload to get updated data
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error?.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLanguageChange = (e) => {
    const value = e.target.value;
    const languagesArray = value.split(',').map(lang => lang.trim()).filter(lang => lang);
    setFormData({ ...formData, languages: languagesArray });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-text-primary">Profile Settings</h1>
        <p className="text-text-secondary">Manage your profile and consultation fee</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Consultation Fee - Highlighted */}
        <div className="bg-bg-card border-2 border-primary/30 rounded-2xl p-6 shadow-card">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-primary/15 text-primary rounded-xl">
              <FiDollarSign className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-primary">Consultation Fee</h2>
              <p className="text-sm text-text-secondary">Set your consultation charges (per appointment)</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary">
              Fee Amount (₹)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-primary">
                ₹
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.consultationFee}
                onChange={(e) => setFormData({ ...formData, consultationFee: e.target.value })}
                className="w-full pl-12 pr-4 py-3 text-2xl font-bold bg-bg-input text-text-primary border-2 border-border-subtle rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                placeholder="250.00"
                required
              />
            </div>
            <div className="flex items-center justify-between text-sm pt-1">
              <p className="text-text-secondary">
                Current fee: <span className="font-semibold text-primary">
                  ₹{profile?.consultationFee ? (profile.consultationFee / 100).toFixed(2) : '250.00'}
                </span>
              </p>
              {formData.consultationFee && parseFloat(formData.consultationFee) !== (profile?.consultationFee / 100) && (
                <p className="text-amber-500 font-medium text-xs">
                  New fee: ₹{parseFloat(formData.consultationFee).toFixed(2)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Hospital Information - Read Only */}
        {profile?.hospitalId && (
          <div className="bg-bg-card rounded-2xl border border-border-subtle p-6 shadow-card">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                <FiHome className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-text-primary">Hospital Information</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-3 bg-bg-muted rounded-xl border border-border-subtle">
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-1">Hospital</span>
                <span className="text-sm font-bold text-text-primary">{profile.hospitalId.name}</span>
              </div>
              <div className="p-3 bg-bg-muted rounded-xl border border-border-subtle">
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-1">Location</span>
                <span className="text-sm font-semibold text-text-primary">{profile.hospitalId.district}, {profile.hospitalId.city || 'Kerala'}</span>
              </div>
              {profile.hospitalId.address && (
                <div className="p-3 bg-bg-muted rounded-xl border border-border-subtle">
                  <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-1">Address</span>
                  <span className="text-sm text-text-secondary">{profile.hospitalId.address}</span>
                </div>
              )}
              {profile.hospitalId.phone && (
                <div className="p-3 bg-bg-muted rounded-xl border border-border-subtle">
                  <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-1">Phone</span>
                  <span className="text-sm text-text-secondary">{profile.hospitalId.phone}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Basic Information */}
        <div className="bg-bg-card rounded-2xl border border-border-subtle p-6 shadow-card">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
              <FiUser className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-text-primary">Basic Information</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5">
                Bio
              </label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                rows={4}
                className="w-full px-4 py-3 bg-bg-input text-text-primary border border-border-subtle rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                placeholder="Tell patients about yourself..."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5">
                Qualifications
              </label>
              <input
                type="text"
                value={formData.qualifications}
                onChange={(e) => setFormData({ ...formData, qualifications: e.target.value })}
                className="w-full px-4 py-2.5 bg-bg-input text-text-primary border border-border-subtle rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                placeholder="MBBS, MD, etc."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5">
                Years of Experience
              </label>
              <input
                type="number"
                min="0"
                value={formData.experienceYears}
                onChange={(e) => setFormData({ ...formData, experienceYears: e.target.value })}
                className="w-full px-4 py-2.5 bg-bg-input text-text-primary border border-border-subtle rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                placeholder="10"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5">
                Languages Spoken
              </label>
              <input
                type="text"
                value={formData.languages.join(', ')}
                onChange={handleLanguageChange}
                className="w-full px-4 py-2.5 bg-bg-input text-text-primary border border-border-subtle rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                placeholder="English, Hindi, Malayalam (comma separated)"
              />
            </div>
          </div>
        </div>

        {/* Location Information */}
        <div className="bg-bg-card rounded-2xl border border-border-subtle p-6 shadow-card">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
              <FiMapPin className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-text-primary">Location</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5">
                Clinic/Hospital Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-4 py-2.5 bg-bg-input text-text-primary border border-border-subtle rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                placeholder="123 Medical Street, City"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5">
                District
              </label>
              <input
                type="text"
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                className="w-full px-4 py-2.5 bg-bg-input text-text-primary border border-border-subtle rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                placeholder="District name"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={loadProfile}
            className="px-6 py-2.5 border border-border-subtle text-text-secondary rounded-xl hover:bg-bg-card-hover transition-colors font-medium text-sm"
          >
            Reset
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-hover transition-colors font-semibold text-sm shadow-md disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              <>
                <FiSave className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>

      {/* Info Box */}
      <div className="bg-primary-subtle border border-primary-border rounded-2xl p-5">
        <h3 className="font-bold text-primary mb-2 text-sm">💡 About Consultation Fee</h3>
        <ul className="text-xs text-text-secondary space-y-1.5">
          <li>• Patients will see this fee before booking appointments</li>
          <li>• Fee is charged per consultation/appointment</li>
          <li>• You can update your fee anytime</li>
          <li>• Changes apply to new bookings only</li>
        </ul>
      </div>
    </div>
  );
}
