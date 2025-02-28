const db = require('../config/db');
const emailConfig = require('../config/emailConfig');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');
dotenv.config();
// Generate JWT Token
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendOTPEmail = async (email, otp) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Your OTP for Verification',
    text: `Your OTP for verification is: ${otp}. It is valid for 5 minutes.`
  };
  return emailConfig.sendMail(mailOptions);
};
// Generate and Send OTP API
exports.sendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ status: 400, success: false, message: 'Email is required' });
    }
    const [existingUser] = await db.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // OTP valid for 5 minutes
    if (existingUser.length > 0) {
      await db.query(
        'UPDATE users SET otp = ?, otp_expires_at = ? WHERE email = ?',
        [otp, otpExpiresAt, email]
      );
    } else {
      await db.query(
        'INSERT INTO users (email, otp, otp_expires_at) VALUES (?, ?, ?)',
        [email, otp, otpExpiresAt]
      );
    }
    await sendOTPEmail(email, otp);
    res.status(201).json({
      status: 201,
      success: true,
      message: 'OTP sent to email successfully',
      data: { email, otp }
    });
  } catch (error) {
    res.status(500).json({ status: 500, success: false, message: 'Error sending OTP', error });
  }
};


// Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const [users] = await db.query('SELECT id, name, email FROM users'); // Exclude password for security
    res.status(200).json({ status: 200, success: true, data: users });
  } catch (error) {
    res.status(500).json({ status: 500, success: false, message: 'Database error', error });
  }
};

// Get user by ID
exports.getUserById = async (req, res) => {
  try {

    const userIdFromToken = req.user.id;
    console.log(req.user.id);
    const requestedUserId = parseInt(req.params.id, 10);
    console.log(requestedUserId);
    if (userIdFromToken !== requestedUserId) {
      return res.status(403).json({ status: 403, success: false, message: 'Unauthorized access' });
    }
    const [user] = await db.query('SELECT id, name, email FROM users WHERE id = ?', [requestedUserId]);
    if (user.length === 0) {
      return res.status(404).json({ status: 404, success: false, message: 'User not found' });
    }
    res.status(200).json({ status: 200, success: true, data: user[0] });
  } catch (error) {
    res.status(500).json({ status: 500, success: false, message: 'Database error', error });
  }
};


// Create a new user
exports.createUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const [existingUser] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser.length > 0) {
      return res.status(400).json({ status: 400, success: false, message: 'User already exists' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await db.query('INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name, email, hashedPassword]);

    const userId = result.insertId;
    const token = generateToken({ id: userId, email });
    res.status(201).json({
      status: 201,
      success: true,
      message: 'User created successfully',
      data: { id: userId, name, email, token }
    });
  } catch (error) {
    res.status(500).json({ status: 500, success: false, message: 'Database error', error });
  }
};

// Update a user
exports.updateUser = async (req, res) => {
  try {
    const { name, email } = req.body;
    const userId = req.params.id;

    // Check if email already exists for another user
    const [existingUser] = await db.query('SELECT id FROM users WHERE email = ? AND id != ?', [email, userId]);
    if (existingUser.length > 0) {
      return res.status(400).json({ status: 400, success: false, message: 'Email is already in use' });
    }

    // Update user details
    const [result] = await db.query('UPDATE users SET name = ?, email = ? WHERE id = ?', [name, email, userId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ status: 404, success: false, message: 'User not found' });
    }

    res.status(200).json({ status: 200, success: true, message: 'User updated successfully' });

  } catch (error) {
    res.status(500).json({ status: 500, success: false, message: 'Database error', error });
  }
};

// Delete a user
exports.deleteUser = async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ status: 404, success: false, message: 'User not found' });
    }
    res.status(200).json({ status: 200, success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ status: 500, success: false, message: 'Database error', error });
  }
};
