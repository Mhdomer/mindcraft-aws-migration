import { Router } from 'express';
import Module from '../models/Module.js';
import Course from '../models/Course.js';
import Lesson from '../models/Lesson.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/modules?courseId=
router.get('/', requireAuth, async (req, res) => {
  try {
    const { courseId } = req.query;
    if (!courseId) return res.status(400).json({ error: 'courseId is required' });
    const modules = await Module.find({ courseId }).sort({ order: 1 });
    res.json({ modules });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch modules' });
  }
});

// POST /api/modules
router.post('/', requireAuth, async (req, res) => {
  try {
    const { courseId, title, order } = req.body;
    if (!courseId || !title) return res.status(400).json({ error: 'courseId and title are required' });

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ error: 'Course not found' });

    const isOwner = course.createdBy.toString() === req.user.id;
    if (!isOwner && req.user.role !== 'admin') return res.status(403).json({ error: 'Insufficient permissions' });

    const module = await Module.create({ courseId, title, order: order ?? course.modules.length });
    await Course.findByIdAndUpdate(courseId, { $push: { modules: module._id } });

    res.status(201).json({ module });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create module' });
  }
});

// PUT /api/modules/:id
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const module = await Module.findById(req.params.id);
    if (!module) return res.status(404).json({ error: 'Module not found' });

    const course = await Course.findById(module.courseId);
    const isOwner = course?.createdBy.toString() === req.user.id;
    if (!isOwner && req.user.role !== 'admin') return res.status(403).json({ error: 'Insufficient permissions' });

    const { title, order } = req.body;
    const update = {};
    if (title !== undefined) update.title = title;
    if (order !== undefined) update.order = order;

    const updated = await Module.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json({ module: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update module' });
  }
});

// DELETE /api/modules/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const module = await Module.findById(req.params.id);
    if (!module) return res.status(404).json({ error: 'Module not found' });

    const course = await Course.findById(module.courseId);
    const isOwner = course?.createdBy.toString() === req.user.id;
    if (!isOwner && req.user.role !== 'admin') return res.status(403).json({ error: 'Insufficient permissions' });

    // Delete all lessons in this module
    await Lesson.deleteMany({ moduleId: module._id });
    // Remove module from course
    await Course.findByIdAndUpdate(module.courseId, { $pull: { modules: module._id } });
    await module.deleteOne();

    res.json({ message: 'Module and its lessons deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete module' });
  }
});

export default router;
