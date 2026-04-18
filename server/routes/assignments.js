import { Router } from 'express';
import Assignment from '../models/Assignment.js';
import Submission from '../models/Submission.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// GET /api/assignments?courseId=
router.get('/', requireAuth, async (req, res) => {
  try {
    const { courseId } = req.query;
    const filter = courseId ? { courseId } : {};
    if (req.user.role === 'student') filter.status = 'published';
    if (req.user.role === 'teacher') filter.createdBy = req.user.id;

    const assignments = await Assignment.find(filter).sort({ createdAt: -1 });
    res.json({ assignments });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

// POST /api/assignments
router.post('/', requireAuth, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const { courseId, title, description, deadline, allowLateSubmissions } = req.body;
    if (!courseId || !title) return res.status(400).json({ error: 'courseId and title are required' });

    const assignment = await Assignment.create({
      courseId, title, description, deadline, allowLateSubmissions,
      createdBy: req.user.id,
    });
    res.status(201).json({ assignment });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create assignment' });
  }
});

// GET /api/assignments/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' });
    res.json({ assignment });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch assignment' });
  }
});

// PUT /api/assignments/:id
router.put('/:id', requireAuth, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

    const isOwner = assignment.createdBy.toString() === req.user.id;
    if (!isOwner && req.user.role !== 'admin') return res.status(403).json({ error: 'Insufficient permissions' });

    const { title, description, deadline, status, allowLateSubmissions } = req.body;
    const updated = await Assignment.findByIdAndUpdate(
      req.params.id,
      { title, description, deadline, status, allowLateSubmissions },
      { new: true }
    );
    res.json({ assignment: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update assignment' });
  }
});

// DELETE /api/assignments/:id
router.delete('/:id', requireAuth, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

    const isOwner = assignment.createdBy.toString() === req.user.id;
    if (!isOwner && req.user.role !== 'admin') return res.status(403).json({ error: 'Insufficient permissions' });

    await Submission.deleteMany({ assignmentId: assignment._id });
    await assignment.deleteOne();
    res.json({ message: 'Assignment deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete assignment' });
  }
});

export default router;
