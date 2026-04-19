import { Router } from 'express';
import Lesson from '../models/Lesson.js';
import Module from '../models/Module.js';
import Course from '../models/Course.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/lessons?moduleId=
router.get('/', requireAuth, async (req, res) => {
  try {
    const { moduleId } = req.query;
    if (!moduleId) return res.status(400).json({ error: 'moduleId is required' });
    const lessons = await Lesson.find({ moduleId }).sort({ order: 1 });
    res.json({ lessons });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch lessons' });
  }
});

// POST /api/lessons
router.post('/', requireAuth, async (req, res) => {
  try {
    const { moduleId, title, contentHtml, order, materials, aiGenerated } = req.body;
    if (!moduleId || !title) return res.status(400).json({ error: 'moduleId and title are required' });

    const module = await Module.findById(moduleId);
    if (!module) return res.status(404).json({ error: 'Module not found' });

    let isOwner = false;
    if (module.courseId) {
      const course = await Course.findById(module.courseId);
      isOwner = course?.createdBy?.toString() === req.user.id;
    } else {
      isOwner = req.user.role === 'teacher' || req.user.role === 'admin';
    }
    if (!isOwner && req.user.role !== 'admin') return res.status(403).json({ error: 'Insufficient permissions' });

    const lesson = await Lesson.create({
      moduleId, title, contentHtml, materials,
      order: order ?? module.lessons.length,
      aiGenerated: aiGenerated ?? false,
    });
    await Module.findByIdAndUpdate(moduleId, { $push: { lessons: lesson._id } });

    res.status(201).json({ lesson });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create lesson' });
  }
});

// GET /api/lessons/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
    res.json({ lesson });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch lesson' });
  }
});

// PUT /api/lessons/:id
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) return res.status(404).json({ error: 'Lesson not found' });

    const module = await Module.findById(lesson.moduleId);
    let isOwner = false;
    if (module?.courseId) {
      const course = await Course.findById(module.courseId);
      isOwner = course?.createdBy?.toString() === req.user.id;
    } else {
      isOwner = req.user.role === 'teacher' || req.user.role === 'admin';
    }
    if (!isOwner && req.user.role !== 'admin') return res.status(403).json({ error: 'Insufficient permissions' });

    const { title, contentHtml, materials, order } = req.body;
    const update = {};
    if (title !== undefined) update.title = title;
    if (contentHtml !== undefined) update.contentHtml = contentHtml;
    if (materials !== undefined) update.materials = materials;
    if (order !== undefined) update.order = order;

    const updated = await Lesson.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json({ lesson: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update lesson' });
  }
});

// DELETE /api/lessons/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) return res.status(404).json({ error: 'Lesson not found' });

    const module = await Module.findById(lesson.moduleId);
    let isOwner = false;
    if (module?.courseId) {
      const course = await Course.findById(module.courseId);
      isOwner = course?.createdBy?.toString() === req.user.id;
    } else {
      isOwner = req.user.role === 'teacher' || req.user.role === 'admin';
    }
    if (!isOwner && req.user.role !== 'admin') return res.status(403).json({ error: 'Insufficient permissions' });

    await Module.findByIdAndUpdate(lesson.moduleId, { $pull: { lessons: lesson._id } });
    await lesson.deleteOne();
    res.json({ message: 'Lesson deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete lesson' });
  }
});

export default router;
