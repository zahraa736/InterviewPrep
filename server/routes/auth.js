import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { MemoryStore, rateLimit } from 'express-rate-limit';
import User from '../models/User.js';
import requireAuth from '../middleware/requireAuth.js';
import { isEmailConfigured, sendPasswordResetEmail } from '../utils/passwordResetEmail.js';

const router = express.Router();

function createToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPassword(password) {
  return typeof password === 'string' && password.length >= 6 && password.length <= 128;
}

function isObjectBody(body) {
  return body !== null && typeof body === 'object' && !Array.isArray(body);
}

const forgotPasswordMessage =
  'If an account exists and email delivery succeeds, password reset instructions will arrive shortly.';

export const signupRateLimitStore = new MemoryStore();
export const loginRateLimitStore = new MemoryStore();

const signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  store: signupRateLimitStore,
  message: { error: 'Too many signup attempts. Please try again in 15 minutes.' }
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  store: loginRateLimitStore,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' }
});

const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many password reset attempts. Please try again later.' }
});

router.post('/signup', signupLimiter, async (req, res) => {
  try {
    if (!isObjectBody(req.body)) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }

    if (
      typeof req.body.name !== 'string' ||
      typeof req.body.email !== 'string' ||
      typeof req.body.password !== 'string'
    ) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }

    const name = req.body.name.trim();
    const email = req.body.email.trim().toLowerCase();
    const password = req.body.password;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }
    if (name.length < 2 || name.length > 50) {
      return res.status(400).json({ error: 'Name must be between 2 and 50 characters' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }
    if (password.length < 6 || password.length > 128) {
      return res.status(400).json({ error: 'Password must be between 6 and 128 characters' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const user = await User.create({ name, email, password_hash: password });

    return res.status(201).json({
      message: 'Account created successfully',
      user: user.toJSON()
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }
    return res.status(500).json({ error: 'Could not create account' });
  }
});

router.post('/login', loginLimiter, async (req, res) => {
  try {
    if (!isObjectBody(req.body)) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (typeof req.body.email !== 'string' || typeof req.body.password !== 'string') {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const email = req.body.email.trim().toLowerCase();
    const password = req.body.password;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    const user = await User.findOne({ email }).select('+password_hash');
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = createToken(user._id.toString());
    return res.json({ token, user: user.toJSON() });
  } catch (error) {
    return res.status(500).json({ error: 'Could not log in' });
  }
});

router.post('/forgot-password', passwordResetLimiter, async (req, res) => {
  try {
    if (!isObjectBody(req.body)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    if (typeof req.body.email !== 'string' || !isValidEmail(req.body.email.trim())) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    if (!isEmailConfigured()) {
      return res.status(503).json({
        error: 'Password reset email is not configured. Please contact the administrator.'
      });
    }

    const email = req.body.email.trim().toLowerCase();
    const user = await User.findOne({ email });

    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

      user.resetTokenHash = resetTokenHash;
      user.resetTokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
      await user.save();

      try {
        await sendPasswordResetEmail(user.email, resetToken);
      } catch {
        await User.updateOne(
          { _id: user._id, resetTokenHash },
          { $unset: { resetTokenHash: '', resetTokenExpiresAt: '' } }
        );
      }
    }

    return res.json({ message: forgotPasswordMessage });
  } catch {
    return res.status(500).json({ error: 'Could not process the password reset request' });
  }
});

router.post('/reset-password', passwordResetLimiter, async (req, res) => {
  try {
    if (!isObjectBody(req.body)) {
      return res.status(400).json({ error: 'This password reset link is invalid or has expired' });
    }

    if (typeof req.body.token !== 'string' || !req.body.token.trim()) {
      return res.status(400).json({ error: 'This password reset link is invalid or has expired' });
    }
    if (!isValidPassword(req.body.password)) {
      return res.status(400).json({ error: 'Password must be between 6 and 128 characters' });
    }

    const resetTokenHash = crypto
      .createHash('sha256')
      .update(req.body.token.trim())
      .digest('hex');

    const user = await User.findOneAndUpdate(
      {
        resetTokenHash,
        resetTokenExpiresAt: { $gt: new Date() }
      },
      { $unset: { resetTokenHash: '', resetTokenExpiresAt: '' } },
      { new: false }
    );

    if (!user) {
      return res.status(400).json({ error: 'This password reset link is invalid or has expired' });
    }

    user.password_hash = req.body.password;
    await user.save();

    return res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch {
    return res.status(500).json({ error: 'Could not reset the password' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json({ user });
  } catch (error) {
    return res.status(500).json({ error: 'Could not load profile' });
  }
});

export default router;
