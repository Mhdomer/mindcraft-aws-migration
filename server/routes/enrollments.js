import { Router } from 'express';
import Enrollment from '../models/Enrollment.js';
import Course from '../models/Course.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/enrollments?courseId= — check enrollment status
router.get('/', requireAuth, async (req, res) => {
  try {
    const { courseId } = req.query;
    if (!courseId) return res.status(400).json({ error: 'courseId is required' });

    const enrollment = await Enrollment.findOne({ studentId: req.user.id, courseId });
    res.json({ enrolled: !!enrollment, enrollment });
  } catch (err) {
    res.status(500).json({ error: 'Failed to check enrollment' });
  }
});

// GET /api/enrollments/student — all courses enrolled by current user
router.get('/student', requireAuth, async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ studentId: req.user.id }).populate('courseId');
    res.json({ enrollments });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch enrollments' });
  }
});

// POST /api/enrollments — enroll in a course
router.post('/', requireAuth, async (req, res) => {
  try {
    const { courseId } = req.body;
    if (!courseId) return res.status(400).json({ error: 'courseId is required' });

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ error: 'Course not found' });
    if (course.status !== 'published') return res.status(400).json({ error: 'Cannot enroll in an unpublished course' });

    const existing = await Enrollment.findOne({ studentId: req.user.id, courseId });
    if (existing) return res.status(409).json({ error: 'Already enrolled in this course' });

    const enrollment = await Enrollment.create({ studentId: req.user.id, courseId });
    res.status(201).json({ enrollment });
  } catch (err) {
    res.status(500).json({ error: 'Failed to enroll in course' });
  }
});

// GET /api/enrollments/teacher — all enrollments across current teacher's courses
router.get('/teacher', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    const teacherCourses = await Course.find({ createdBy: req.user.id }).select('_id');
    const courseIds = teacherCourses.map(c => c._id);
    const enrollments = await Enrollment.find({ courseId: { $in: courseIds } });
    res.json({ enrollments, totalStudents: enrollments.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch teacher enrollments' });
  }
});

// PATCH /api/enrollments/:id/progress — update lesson/module completion
router.patch('/:id/progress', requireAuth, async (req, res) => {
  try {
    const { completedLesson, completedModule, overallProgress } = req.body;
    const enrollment = await Enrollment.findById(req.params.id);
    if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' });
    if (enrollment.studentId.toString() !== req.user.id) return res.status(403).json({ error: 'Insufficient permissions' });

    if (completedLesson && !enrollment.progress.completedLessons.includes(completedLesson)) {
      enrollment.progress.completedLessons.push(completedLesson);
    }
    if (completedModule && !enrollment.progress.completedModules.includes(completedModule)) {
      enrollment.progress.completedModules.push(completedModule);
    }
    if (overallProgress !== undefined) {
      enrollment.progress.overallProgress = Math.min(100, Math.max(0, overallProgress));
    }
    await enrollment.save();
    res.json({ enrollment });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

export default router;
