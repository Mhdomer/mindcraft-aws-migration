import { Router } from 'express';
import LessonExercise from '../models/LessonExercise.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/exercises?lessonId=
router.get('/', requireAuth, async (req, res) => {
  try {
    const { lessonId } = req.query;
    if (!lessonId) return res.status(400).json({ error: 'lessonId is required' });
    const exercises = await LessonExercise.find({ lessonId });
    res.json({ exercises });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch exercises' });
  }
});

// POST /api/exercises
router.post('/', requireAuth, async (req, res) => {
  try {
    const { lessonId, type, prompt, options, answer, explanation, difficulty } = req.body;
    if (!lessonId || !type || !prompt) return res.status(400).json({ error: 'lessonId, type, and prompt are required' });
    const exercise = await LessonExercise.create({ lessonId, type, prompt, options, answer, explanation, difficulty });
    res.status(201).json({ exercise });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create exercise' });
  }
});

// GET /api/exercises/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const exercise = await LessonExercise.findById(req.params.id);
    if (!exercise) return res.status(404).json({ error: 'Exercise not found' });
    res.json({ exercise });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch exercise' });
  }
});

// PUT /api/exercises/:id
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { type, prompt, options, answer, explanation, difficulty } = req.body;
    const exercise = await LessonExercise.findByIdAndUpdate(
      req.params.id,
      { type, prompt, options, answer, explanation, difficulty },
      { new: true }
    );
    if (!exercise) return res.status(404).json({ error: 'Exercise not found' });
    res.json({ exercise });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update exercise' });
  }
});

// DELETE /api/exercises/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const exercise = await LessonExercise.findByIdAndDelete(req.params.id);
    if (!exercise) return res.status(404).json({ error: 'Exercise not found' });
    res.json({ message: 'Exercise deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete exercise' });
  }
});

export default router;
