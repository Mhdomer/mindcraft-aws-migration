import { Router } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// GET /api/users — admin only
router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const users = await User.find().select('-passwordHash').sort({ createdAt: -1 });
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/users/:id — self or admin
router.get('/:id', requireAuth, async (req, res) => {
  try {
    if (req.user.id !== req.params.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    const user = await User.findById(req.params.id).select('-passwordHash');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// PUT /api/users/:id — self or admin
router.put('/:id', requireAuth, async (req, res) => {
  try {
    if (req.user.id !== req.params.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    const { name, email } = req.body;
    const update = {};
    if (name) update.name = name;
    if (email) update.email = email.toLowerCase();

    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select('-passwordHash');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// PUT /api/users/:id/password — self only
router.put('/:id/password', requireAuth, async (req, res) => {
  try {
    if (req.user.id !== req.params.id) return res.status(403).json({ error: 'Insufficient permissions' });
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both passwords are required' });
    if (newPassword.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await user.save();
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update password' });
  }
});

// DELETE /api/users/:id — admin only, cannot delete self
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    if (req.user.id === req.params.id) return res.status(400).json({ error: 'Cannot delete your own account' });
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;
