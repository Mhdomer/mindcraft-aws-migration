import { Router } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { signToken, setAuthCookie, clearAuthCookie, requireAuth } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, role = 'student' } = req.body;
    if (!email || !password || !name) return res.status(400).json({ error: 'email, password, and name are required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    if (!['student', 'teacher', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role' });

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(409).json({ error: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ email, passwordHash, name, role });

    const token = signToken({ id: user._id, email: user.email, role: user.role, name: user.name });
    setAuthCookie(res, token);

    res.status(201).json({ user: { id: user._id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    if (user.status !== 'active') return res.status(403).json({ error: 'Account is inactive' });

    await User.findByIdAndUpdate(user._id, { isOnline: true, lastSeen: new Date() });

    const token = signToken({ id: user._id, email: user.email, role: user.role, name: user.name });
    setAuthCookie(res, token);

    res.json({ user: { id: user._id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/logout
router.post('/logout', requireAuth, async (req, res) => {
  await User.findByIdAndUpdate(req.user.id, { isOnline: false, lastSeen: new Date() });
  clearAuthCookie(res);
  res.json({ message: 'Logged out successfully' });
});

// GET /api/auth/me  — return current user from token
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// POST /api/auth/heartbeat — keep online presence alive
router.post('/heartbeat', requireAuth, async (req, res) => {
  await User.findByIdAndUpdate(req.user.id, { isOnline: true, lastSeen: new Date() });
  res.json({ ok: true });
});

export default router;
