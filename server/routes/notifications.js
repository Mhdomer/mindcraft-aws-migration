import { Router } from 'express';
import Notification from '../models/Notification.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/notifications
router.get('/', requireAuth, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(50);
    res.json({ notifications });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// POST /api/notifications — teacher/admin creates notification
router.post('/', requireAuth, async (req, res) => {
  try {
    const { userId, type, title, message, courseId, itemId, guidance } = req.body;
    if (!userId || !type || !title || !message) return res.status(400).json({ error: 'userId, type, title, and message are required' });
    const notification = await Notification.create({ userId, type, title, message, courseId, itemId, guidance });
    res.status(201).json({ notification });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', requireAuth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { read: true },
      { new: true }
    );
    if (!notification) return res.status(404).json({ error: 'Notification not found' });
    res.json({ notification });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

// PATCH /api/notifications/read-all
router.patch('/read-all', requireAuth, async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user.id, read: false }, { read: true });
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

export default router;
