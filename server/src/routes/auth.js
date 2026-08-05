import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Helper: sign JWT and set httpOnly cookie
const sendTokenResponse = (res, user, statusCode, message) => {
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };

  res.cookie('token', token, options);
  res.status(statusCode).json({ success: true, message, token, user });
};

// @route   POST /api/auth/signup
// @desc    Register a new user
// @access  Public
router.post('/signup', async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      confirmPassword,
      age,
      gender,
      occupationType,
      college,
      monthlyAllowance,
      sector,
      monthlyIncome,
      region,
      currency,
    } = req.body;

    // --- Validation ---
    if (!name || !email || !password || !age || !occupationType) {
      return res.status(400).json({ success: false, message: 'Please fill in all required fields' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    if (!['student', 'professional'].includes(occupationType)) {
      return res.status(400).json({ success: false, message: 'Invalid occupation type' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists' });
    }

    // Normalize income: student uses allowance, professional uses income
    let normalizedIncome = 0;
    if (occupationType === 'student') {
      normalizedIncome = Number(monthlyAllowance) || 0;
    } else {
      normalizedIncome = Number(monthlyIncome) || 0;
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      age: Number(age),
      gender: gender || '',
      occupationType,
      college: occupationType === 'student' ? college || '' : '',
      monthlyAllowance: occupationType === 'student' ? normalizedIncome : 0,
      sector: occupationType === 'professional' ? sector || '' : '',
      monthlyIncome: normalizedIncome,
      region: region || '',
      currency: currency || 'INR',
    });

    sendTokenResponse(res, user, 201, 'Account created successfully');
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ success: false, message: 'Server error during signup' });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    sendTokenResponse(res, user, 200, 'Login successful');
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current logged-in user
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    res.json({ success: true, user: req.user });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user (clear cookie)
// @access  Private
router.post('/logout', protect, (req, res) => {
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out successfully' });
});

export default router;