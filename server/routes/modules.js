import { Router } from 'express';
import Module from '../models/Module.js';
import Course from '../models/Course.js';
import Lesson from '../models/Lesson.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/modules?courseId=   (courseId optional — omit for standalone library)
router.get('/', requireAuth, async (req, res) => {
  try {
    const { courseId } = req.query;
    const filter = courseId ? { courseId } : { courseId: { $exists: false } };
    const modules = await Module.find(filter).sort({ order: 1 });
    res.json({ modules });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch modules' });
  }
});

// GET /api/modules/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const module = await Module.findById(req.params.id).populate('lessons');
    if (!module) return res.status(404).json({ error: 'Module not found' });
    res.json({ module });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch module' });
  }
});

// POST /api/modules
router.post('/', requireAuth, async (req, res) => {
  try {
    const { courseId, title, order } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required' });

    let orderVal = order;

    if (courseId) {
      const course = await Course.findById(courseId);
      if (!course) return res.status(404).json({ error: 'Course not found' });

      const isOwner = course.createdBy.toString() === req.user.id;
      if (!isOwner && req.user.role !== 'admin') return res.status(403).json({ error: 'Insufficient permissions' });

      if (orderVal === undefined) orderVal = course.modules.length;
      const module = await Module.create({ courseId, title, order: orderVal });
      await Course.findByIdAndUpdate(courseId, { $push: { modules: module._id } });
      return res.status(201).json({ module });
    }

    // Standalone module (no courseId)
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    const count = await Module.countDocuments({ courseId: { $exists: false } });
    const module = await Module.create({ title, order: orderVal ?? count });
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

    if (module.courseId) {
      const course = await Course.findById(module.courseId);
      const isOwner = course?.createdBy.toString() === req.user.id;
      if (!isOwner && req.user.role !== 'admin') return res.status(403).json({ error: 'Insufficient permissions' });
    } else {
      if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
    }

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

    if (module.courseId) {
      const course = await Course.findById(module.courseId);
      const isOwner = course?.createdBy.toString() === req.user.id;
      if (!isOwner && req.user.role !== 'admin') return res.status(403).json({ error: 'Insufficient permissions' });
      await Course.findByIdAndUpdate(module.courseId, { $pull: { modules: module._id } });
    } else {
      if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
    }

    await Lesson.deleteMany({ moduleId: module._id });
    await module.deleteOne();

    res.json({ message: 'Module and its lessons deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete module' });
  }
});

export default router;
