const User = require('../models/User');
const Doctor = require('../models/Doctor'); // Import the Doctor model
const { validationResult } = require('express-validator');
const { createRoleBasedNotifications } = require('../utils/createNotification');

// Helper to send cookie
const sendTokenCookie = (res, token) => {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });
};

/**
 * @desc    Register a new user (patient or doctor)
 * @route   POST /api/auth/register
 * @access  Public
 */
exports.register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  // Destructure all required fields from the request body
  const { name, email, password, role, specializationId, district, hospitalId } = req.body;

  try {
    // SECURITY: Define whitelist of roles that users can self-register as
    const selfRegisterRoles = ['patient', 'doctor'];
    
    // Validate the role against the whitelist
    if (role && !selfRegisterRoles.includes(role)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid role specified. Only patient and doctor roles are allowed for registration.' 
      });
    }

    // Check if a user with the given email already exists
    let existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    // Determine the final role and status based on secure logic
    const finalRole = role || 'patient'; // Default to patient if no role provided
    const finalStatus = finalRole === 'doctor' ? 'pending_approval' : 'active';

    // Step 1: Create the new user with validated role and appropriate status
    const user = await User.create({
      name,
      email,
      password,
      role: finalRole,
      status: finalStatus,
      district,
    });

    // Step 2: If the user is a doctor, create their professional Doctor profile
    if (user.role === 'doctor') {
      // Validate that specialization, district, and hospital are provided for doctors
      if (!specializationId) {
        // Rollback user creation
        await User.findByIdAndDelete(user._id);
        return res.status(400).json({ success: false, message: 'Specialization is required for doctors.' });
      }
      if (!district) {
        // Rollback user creation
        await User.findByIdAndDelete(user._id);
        return res.status(400).json({ success: false, message: 'District is required for doctors.' });
      }
      if (!hospitalId) {
        // Rollback user creation
        await User.findByIdAndDelete(user._id);
        return res.status(400).json({ success: false, message: 'Hospital is required for doctors.' });
      }
      
      // Create the corresponding doctor document with their district and hospital
      await Doctor.create({
        userId: user._id,
        specializationId: specializationId,
        hospitalId: hospitalId,
        availability: [],
        district: district,
        verificationStatus: 'Pending', // Doctors start as pending
      });

      // Notify all admins about new doctor registration
      await createRoleBasedNotifications(
        'admin',
        `A new doctor, ${user.name}, has registered and is awaiting approval`,
        '/admin/doctors',
        'system',
        { doctorId: user._id, doctorName: user.name, district, hospitalId }
      );
    }

    // Step 3: Set cookie and return user info
    const token = user.getSignedJwtToken();
    sendTokenCookie(res, token);
    res.status(201).json({ 
      success: true,
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role, 
        status: user.status,
        district: user.district 
      }
    });

  } catch (e) {
    console.error('Registration error:', e);
    // If any part of the process fails, clean up
    if (e.code === 11000) {
      // Duplicate key error (email already exists)
      return res.status(400).json({ 
        success: false, 
        message: 'Registration failed. The email might already be in use.' 
      });
    }
    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
};

/**
 * @desc    Login a user
 * @route   POST /api/auth/login
 * @access  Public
 */
exports.login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password, role } = req.body;

  try {
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const match = await user.matchPassword(password);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Validate role selection (admin can login from any role selection)
    if (role && user.role !== 'admin') {
      if (user.role !== role) {
        return res.status(401).json({ 
          success: false, 
          message: `Please select "${user.role}" to login with this account` 
        });
      }
    }

    // Fetch photoUrl from Doctor model if user is a doctor
    let photoUrl = user.photoUrl;
    if (user.role === 'doctor') {
      const doctor = await Doctor.findOne({ userId: user._id }).select('photoUrl');
      if (doctor && doctor.photoUrl) {
        photoUrl = doctor.photoUrl;
      }
    }

    const token = user.getSignedJwtToken();
    sendTokenCookie(res, token);
    res.json({ 
      success: true,
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role, 
        district: user.district,
        photoUrl: photoUrl 
      }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @desc    Get current logged in user
 * @route   GET /api/auth/me
 * @access  Private
 */
exports.getMe = async (req, res) => {
  try {
    // req.user is set by the 'protect' middleware
    const user = await User.findById(req.user.id).select('-password');
    
    // Fetch photoUrl from Doctor model if user is a doctor
    if (user.role === 'doctor') {
      const doctor = await Doctor.findOne({ userId: user._id }).select('photoUrl');
      if (doctor && doctor.photoUrl) {
        user.photoUrl = doctor.photoUrl;
      }
    }
    
    res.json({ success: true, data: user });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @desc    Logout current user (clear cookie)
 * @route   POST /api/auth/logout
 * @access  Private
 */
exports.logout = async (req, res) => {
  try {
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
    });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};