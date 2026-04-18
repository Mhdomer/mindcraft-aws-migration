import { Router } from 'express';
import Course from '../models/Course.js';
import User from '../models/User.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// GET /api/courses
router.get('/', requireAuth, async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'student') filter.status = 'published';
    if (req.user.role === 'teacher') filter.createdBy = req.user.id;
    const courses = await Course.find(filter).populate('modules', 'title order').sort({ createdAt: -1 });
    res.json({ courses });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

// POST /api/courses
router.post('/', requireAuth, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });
    const author = await User.findById(req.user.id).select('name email');
    const course = await Course.create({
      title, description, createdBy: req.user.id,
      authorName: author.name, authorEmail: author.email,
    });
    res.status(201).json({ course });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create course' });
  }
});

// GET /api/courses/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).populate('modules');
    if (!course) return res.status(404).json({ error: 'Course not found' });
    res.json({ course });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch course' });
  }
});

// PUT /api/courses/:id
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ error: 'Course not found' });

    const isOwner = course.createdBy.toString() === req.user.id;
    if (!isOwner && req.user.role !== 'admin') return res.status(403).json({ error: 'Insufficient permissions' });

    const { title, description, status } = req.body;
    const update = {};
    if (title !== undefined) update.title = title;
    if (description !== undefined) update.description = description;
    if (status !== undefined) update.status = status;

    const updated = await Course.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json({ course: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update course' });
  }
});

// DELETE /api/courses/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ error: 'Course not found' });

    const isOwner = course.createdBy.toString() === req.user.id;
    if (!isOwner && req.user.role !== 'admin') return res.status(403).json({ error: 'Insufficient permissions' });

    await course.deleteOne();
    res.json({ message: 'Course deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete course' });
  }
});

export default router;
