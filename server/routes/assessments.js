import { Router } from 'express';
import Assessment from '../models/Assessment.js';
import Submission from '../models/Submission.js';
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
    const {
      courseId, courseTitle, title, description, type, questions, status,
      timer, startDate, endDate, attempts, passingPercentage, allowLateSubmission,
    } = req.body;
    if (!courseId || !title) return res.status(400).json({ error: 'courseId and title are required' });
    const assessment = await Assessment.create({
      courseId, courseTitle, title, description, type: type || 'quiz',
      questions: questions || [], status: status || 'draft',
      timer: timer || null, startDate: startDate || null, endDate: endDate || null,
      attempts: attempts || 1, passingPercentage: passingPercentage ?? 40,
      allowLateSubmission: allowLateSubmission || false,
      createdBy: req.user.id,
    });
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

    const {
      title, description, courseId, courseTitle, type, questions, status,
      timer, startDate, endDate, attempts, passingPercentage, allowLateSubmission,
    } = req.body;

    const updated = await Assessment.findByIdAndUpdate(
      req.params.id,
      {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(courseId !== undefined && { courseId }),
        ...(courseTitle !== undefined && { courseTitle }),
        ...(type !== undefined && { type }),
        ...(questions !== undefined && { questions }),
        ...(status !== undefined && { status }),
        ...(timer !== undefined && { timer }),
        ...(startDate !== undefined && { startDate }),
        ...(endDate !== undefined && { endDate }),
        ...(attempts !== undefined && { attempts }),
        ...(passingPercentage !== undefined && { passingPercentage }),
        ...(allowLateSubmission !== undefined && { allowLateSubmission }),
      },
      { new: true }
    );
    res.json({ assessment: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update assessment' });
  }
});

router.delete('/:id', requireAuth, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const assessment = await Assessment.findByIdAndDelete(req.params.id);
    if (!assessment) return res.status(404).json({ error: 'Assessment not found' });
    await Submission.deleteMany({ assessmentId: assessment._id });
    res.json({ message: 'Assessment deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete assessment' });
  }
});

export default router;
