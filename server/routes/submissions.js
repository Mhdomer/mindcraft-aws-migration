import { Router } from 'express';
import Submission from '../models/Submission.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// GET /api/submissions?assignmentId= or ?assessmentId= or ?studentId=
router.get('/', requireAuth, async (req, res) => {
  try {
    const { assignmentId, assessmentId, studentId } = req.query;
    const filter = {};
    if (assignmentId) filter.assignmentId = assignmentId;
    if (assessmentId) filter.assessmentId = assessmentId;
    if (studentId) {
      if (req.user.role === 'student' && studentId !== req.user.id) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      filter.studentId = studentId;
    } else if (req.user.role === 'student') {
      filter.studentId = req.user.id;
    }
    const submissions = await Submission.find(filter).sort({ submittedAt: -1 });
    res.json({ submissions });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

// POST /api/submissions
router.post('/', requireAuth, async (req, res) => {
  try {
    const { assignmentId, assessmentId, content, answers, score, totalPoints, isAutoSubmit, isLate } = req.body;
    if (!assignmentId && !assessmentId) return res.status(400).json({ error: 'assignmentId or assessmentId is required' });

    const student = await User.findById(req.user.id).select('name email');
    const submission = await Submission.create({
      studentId: req.user.id,
      studentName: student.name,
      studentEmail: student.email,
      assignmentId: assignmentId || null,
      assessmentId: assessmentId || null,
      content: content || '',
      answers: answers || null,
      score: score ?? null,
      totalPoints: totalPoints ?? null,
      isAutoSubmit: isAutoSubmit || false,
      isLate: isLate || false,
    });
    res.status(201).json({ submission });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create submission' });
  }
});

// GET /api/submissions/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);
    if (!submission) return res.status(404).json({ error: 'Submission not found' });

    const isStudent = submission.studentId.toString() === req.user.id;
    if (!isStudent && !['teacher', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    res.json({ submission });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch submission' });
  }
});

// PUT /api/submissions/:id/grade — teacher saves draft grade
router.put('/:id/grade', requireAuth, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const { draftGrade, draftFeedback } = req.body;
    const submission = await Submission.findByIdAndUpdate(
      req.params.id,
      { draftGrade, draftFeedback, lastSavedAt: new Date() },
      { new: true }
    );
    if (!submission) return res.status(404).json({ error: 'Submission not found' });
    res.json({ submission });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save grade' });
  }
});

// POST /api/submissions/:id/release — teacher releases feedback to student
router.post('/:id/release', requireAuth, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const submission = await Submission.findByIdAndUpdate(
      req.params.id,
      {
        grade: undefined, // will be set below
        feedback: undefined,
        feedbackReleased: true,
        gradedAt: new Date(),
        gradedBy: req.user.id,
      },
      { new: true }
    );
    if (!submission) return res.status(404).json({ error: 'Submission not found' });

    // Promote draft to official
    submission.grade = submission.draftGrade;
    submission.feedback = submission.draftFeedback;
    await submission.save();

    // Notify student
    await Notification.create({
      userId: submission.studentId,
      type: 'feedback_released',
      title: 'Feedback Released',
      message: `Your submission has been graded. Grade: ${submission.grade}`,
      itemId: submission._id,
    });

    res.json({ submission });
  } catch (err) {
    res.status(500).json({ error: 'Failed to release feedback' });
  }
});

export default router;
