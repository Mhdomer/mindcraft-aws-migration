import { Router } from 'express';
import Assessment from '../models/Assessment.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const { courseId } = req.query;
    const filter = courseId ? { courseId } : {};
    if (req.user.role === 'student') filter.status = 'published';
    const assessments = await Assessment.find(filter).sort({ createdAt: -1 });
    res.json({ assessments });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch assessments' });
  }
});

router.post('/', requireAuth, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const { courseId, title, description, questions } = req.body;
    if (!courseId || !title) return res.status(400).json({ error: 'courseId and title are required' });
    const assessment = await Assessment.create({ courseId, title, description, questions, createdBy: req.user.id });
    res.status(201).json({ assessment });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create assessment' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const assessment = await Assessment.findById(req.params.id);
    if (!assessment) return res.status(404).json({ error: 'Assessment not found' });
    res.json({ assessment });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch assessment' });
  }
});

router.put('/:id', requireAuth, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const assessment = await Assessment.findById(req.params.id);
    if (!assessment) return res.status(404).json({ error: 'Assessment not found' });
    const isOwner = assessment.createdBy.toString() === req.user.id;
    if (!isOwner && req.user.role !== 'admin') return res.status(403).json({ error: 'Insufficient permissions' });
    const { title, description, questions, status } = req.body;
    const updated = await Assessment.findByIdAndUpdate(req.params.id, { title, description, questions, status }, { new: true });
    res.json({ assessment: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update assessment' });
  }
});

router.delete('/:id', requireAuth, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const assessment = await Assessment.findByIdAndDelete(req.params.id);
    if (!assessment) return res.status(404).json({ error: 'Assessment not found' });
    res.json({ message: 'Assessment deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete assessment' });
  }
});

export default router;
