import { useState, useEffect, useRef } from 'react';
import { FiUser, FiMail, FiMapPin, FiCamera, FiEdit2, FiSave, FiX, FiLock, FiCalendar, FiTrash2, FiHome } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { KERALA_DISTRICTS } from '../constants';
import { AppSelect, Avatar } from '../components/ui';
import { ProfileSkeleton, FormSkeleton } from '../components/ui/SkeletonLoader';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const fileInputRef = useRef(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    district: ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Fetch profile data
  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get('/profile');
      const profileData = response.data.data;
      setProfile(profileData);
      setFormData({
        name: profileData.name || '',
        email: profileData.email || '',
        district: profileData.district || ''
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle password input changes
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Save profile changes
  const handleSaveProfile = async () => {
    try {
      const response = await api.put('/profile', formData);
      if (response.data.success) {
        setProfile(response.data.data);
        setEditing(false);
        toast.success('Profile updated successfully!');
        
        // Update user context with new data
        updateUser({
          ...user,
          name: response.data.data.name,
          email: response.data.data.email,
          district: response.data.data.district
        });
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      const errorMessage = error.response?.data?.message || 'Failed to update profile';
      toast.error(errorMessage);
    }
  };

  // Handle profile picture upload
  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    const formData = new FormData();
    formData.append('profilePicture', file);

    try {
      setUploading(true);
      const response = await api.post('/profile/upload-picture', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        const newPhotoUrl = response.data.data.photoUrl;
        setProfile(prev => ({ ...prev, photoUrl: newPhotoUrl }));
        updateUser({ ...user, photoUrl: newPhotoUrl });
        toast.success('Profile picture updated successfully!');
      }
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      const errorMessage = error.response?.data?.message || 'Failed to upload profile picture';
      toast.error(errorMessage);
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Remove profile picture
  const handleRemovePicture = async () => {
    try {
      const response = await api.delete('/profile/picture');
      if (response.data.success) {
        setProfile(prev => ({ ...prev, photoUrl: '' }));
        updateUser({ ...user, photoUrl: '' });
        toast.success('Profile picture removed successfully!');
      }
    } catch (error) {
      console.error('Error removing profile picture:', error);
      toast.error('Failed to remove profile picture');
    }
  };

  // Change password
  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters long');
      return;
    }

    try {
      const response = await api.put('/profile/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      if (response.data.success) {
        setShowPasswordModal(false);
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        toast.success('Password changed successfully!');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      const errorMessage = error.response?.data?.message || 'Failed to change password';
      toast.error(errorMessage);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">My Profile</h1>
          <p className="text-text-secondary">Manage your personal information and settings</p>
        </div>
        <ProfileSkeleton />
        <div className="bg-bg-card rounded-2xl shadow-card border border-border-subtle p-6">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Profile Information</h2>
          <FormSkeleton fields={4} />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary-hover text-white rounded-2xl p-8 shadow-md">
        <div className="flex items-center gap-6">
          <div className="relative flex-shrink-0">
            <Avatar
              src={profile?.photoUrl}
              name={profile?.name}
              size="3xl"
              className="border-4 border-white shadow-lg"
            />
            
            {/* Upload/Remove Picture Buttons */}
            <div className="absolute -bottom-2 -right-2 flex gap-1">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="bg-white text-primary p-2 rounded-full shadow-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
                title="Change picture"
                aria-label="Change picture"
              >
                {uploading ? (
                  <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full"></div>
                ) : (
                  <FiCamera className="w-4 h-4" />
                )}
              </button>
              
              {profile?.photoUrl && (
                <button
                  onClick={handleRemovePicture}
                  className="bg-red-500 text-white p-2 rounded-full shadow-lg hover:bg-red-600 transition-colors"
                  title="Remove picture"
                  aria-label="Remove picture"
                >
                  <FiTrash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
          
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold mb-1 text-white truncate">{profile?.name}</h1>
            <p className="text-white/80 text-base capitalize">{profile?.role}</p>
            <p className="text-white/60 text-xs mt-1">
              Member since {new Date(profile?.createdAt).toLocaleDateString('en-US', { 
                month: 'long', 
                year: 'numeric' 
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Profile Information */}
      <div className="bg-bg-card rounded-2xl shadow-card border border-border-subtle overflow-hidden">
        <div className="p-6 border-b border-border-subtle bg-bg-muted">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-text-primary">Profile Information</h2>
            <button
              onClick={() => {
                if (editing) {
                  setFormData({
                    name: profile?.name || '',
                    email: profile?.email || '',
                    district: profile?.district || ''
                  });
                }
                setEditing(!editing);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-hover transition-colors text-sm font-semibold shadow-sm"
            >
              {editing ? <FiX className="w-4 h-4" /> : <FiEdit2 className="w-4 h-4" />}
              {editing ? 'Cancel' : 'Edit'}
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Name Field */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm font-semibold text-text-secondary">
              <FiUser className="w-4 h-4 text-primary" />
              Full Name
            </label>
            {editing ? (
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-bg-input text-text-primary border border-border-subtle rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-sm"
                placeholder="Enter your full name"
              />
            ) : (
              <div className="px-4 py-3 bg-bg-muted rounded-xl text-text-primary font-medium text-sm border border-border-subtle">
                {profile?.name || 'Not provided'}
              </div>
            )}
          </div>

          {/* Email Field - Always Disabled */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm font-semibold text-text-secondary">
              <FiMail className="w-4 h-4 text-primary" />
              Email Address
              <span className="text-xs font-normal text-text-muted">(Cannot be changed)</span>
            </label>
            <div className="relative">
              <input
                type="email"
                value={profile?.email || 'Not provided'}
                disabled
                className="w-full px-4 py-3 bg-bg-muted border border-border-subtle rounded-xl text-text-muted cursor-not-allowed text-sm"
              />
              <FiLock className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted w-4 h-4" />
            </div>
          </div>

          {/* District Field */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm font-semibold text-text-secondary">
              <FiMapPin className="w-4 h-4 text-primary" />
              District
            </label>
            {editing ? (
              <AppSelect
                value={formData.district}
                onChange={(value) => setFormData(prev => ({ ...prev, district: value }))}
                options={[
                  { value: '', label: 'Select District' },
                  ...KERALA_DISTRICTS.map(district => ({ value: district, label: district }))
                ]}
                placeholder="Select your district"
                searchable
                searchPlaceholder="Search districts..."
              />
            ) : (
              <div className="px-4 py-3 bg-bg-muted rounded-xl text-text-primary font-medium text-sm border border-border-subtle">
                {profile?.district || 'Not provided'}
              </div>
            )}
          </div>

          {/* Save Button */}
          {editing && (
            <div className="flex gap-3 pt-3">
              <button
                onClick={handleSaveProfile}
                className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary-hover transition-colors font-semibold text-sm shadow-md"
              >
                <FiSave className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Hospital Information - For Doctors Only */}
      {profile?.role === 'doctor' && profile?.doctorProfile?.hospitalId && (
        <div className="bg-bg-card rounded-2xl shadow-card border border-border-subtle overflow-hidden">
          <div className="p-6 border-b border-border-subtle bg-bg-muted">
            <div className="flex items-center gap-3">
              <FiHome className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold text-text-primary">Hospital Information</h2>
            </div>
          </div>

          <div className="p-6">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-bg-muted border border-border-subtle flex items-start gap-3">
                <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 text-primary">
                  <FiHome className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Hospital Name</p>
                  <p className="text-base font-bold text-text-primary">{profile.doctorProfile.hospitalId.name}</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-bg-muted border border-border-subtle flex items-start gap-3">
                <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 text-primary">
                  <FiMapPin className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Location</p>
                  <p className="text-sm font-semibold text-text-primary">{profile.doctorProfile.hospitalId.district}, {profile.doctorProfile.hospitalId.city || 'Kerala'}</p>
                  {profile.doctorProfile.hospitalId.address && (
                    <p className="text-xs text-text-secondary mt-0.5">{profile.doctorProfile.hospitalId.address}</p>
                  )}
                </div>
              </div>

              {profile.doctorProfile.hospitalId.phone && (
                <div className="p-4 rounded-xl bg-bg-muted border border-border-subtle flex items-start gap-3">
                  <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 text-primary">
                    <FiUser className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Contact</p>
                    <p className="text-sm font-semibold text-text-primary">{profile.doctorProfile.hospitalId.phone}</p>
                    {profile.doctorProfile.hospitalId.email && (
                      <p className="text-xs text-text-secondary mt-0.5">{profile.doctorProfile.hospitalId.email}</p>
                    )}
                  </div>
                </div>
              )}

              {profile.doctorProfile.specializationId && (
                <div className="p-4 rounded-xl bg-bg-muted border border-border-subtle flex items-start gap-3">
                  <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 text-primary">
                    <FiCalendar className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Specialization</p>
                    <p className="text-sm font-semibold text-text-primary">{profile.doctorProfile.specializationId.name}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Security Section */}
      <div className="bg-bg-card rounded-2xl shadow-card border border-border-subtle overflow-hidden">
        <div className="p-6 border-b border-border-subtle bg-bg-muted">
          <h2 className="text-xl font-bold text-text-primary">Security</h2>
        </div>

        <div className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-bg-muted border border-border-subtle rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                <FiLock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-text-primary text-sm">Account Password</h3>
                <p className="text-xs text-text-muted mt-0.5">Last updated: {new Date(profile?.updatedAt || Date.now()).toLocaleDateString()}</p>
              </div>
            </div>
            <button
              onClick={() => setShowPasswordModal(true)}
              className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-hover transition-colors font-semibold text-sm shadow-sm"
            >
              Change Password
            </button>
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-bg-card text-text-primary rounded-2xl shadow-2xl border border-border-subtle w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6 pb-3 border-b border-border-subtle">
              <h3 className="text-xl font-bold text-text-primary">Change Password</h3>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-card-hover"
                aria-label="Close dialog"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5">
                  Current Password
                </label>
                <input
                  type="password"
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  className="w-full px-4 py-2.5 bg-bg-input text-text-primary border border-border-subtle rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-sm"
                  placeholder="Enter current password"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5">
                  New Password
                </label>
                <input
                  type="password"
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  className="w-full px-4 py-2.5 bg-bg-input text-text-primary border border-border-subtle rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-sm"
                  placeholder="Enter new password"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  className="w-full px-4 py-2.5 bg-bg-input text-text-primary border border-border-subtle rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-sm"
                  placeholder="Confirm new password"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-3 border-t border-border-subtle">
              <button
                onClick={() => setShowPasswordModal(false)}
                className="flex-1 px-4 py-2.5 border border-border-subtle text-text-secondary rounded-xl hover:bg-bg-card-hover transition-colors font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleChangePassword}
                className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-hover transition-colors font-semibold text-sm shadow-sm"
              >
                Change Password
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
