import { Router } from 'express';
import GameLevel from '../models/GameLevel.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const levels = await GameLevel.find().sort({ order: 1 });
    res.json({ levels });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch game levels' });
  }
});

router.post('/', requireAuth, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const { title, description, content, order } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });
    const level = await GameLevel.create({ title, description, content, order });
    res.status(201).json({ level });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create game level' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const level = await GameLevel.findById(req.params.id);
    if (!level) return res.status(404).json({ error: 'Game level not found' });
    res.json({ level });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch game level' });
  }
});

router.put('/:id', requireAuth, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const level = await GameLevel.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!level) return res.status(404).json({ error: 'Game level not found' });
    res.json({ level });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update game level' });
  }
});

export default router;
