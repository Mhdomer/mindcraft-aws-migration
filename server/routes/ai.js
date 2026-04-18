import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// Gemini is kept as an external managed service.
// These routes proxy AI requests — Gemini SDK is called server-side to keep the API key out of the browser.

async function callGemini(prompt) {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

// POST /api/ai — multi-action AI endpoint
router.post('/', requireAuth, async (req, res) => {
  try {
    const { action, context } = req.body;
    if (!action) return res.status(400).json({ error: 'action is required' });

    let prompt = '';
    switch (action) {
      case 'improve_lesson':
        prompt = `Improve this lesson content for clarity and engagement:\n\n${context?.content}`;
        break;
      case 'generate_exercises':
        prompt = `Generate 5 exercises for this lesson:\n\n${context?.lessonContent}\n\nReturn as JSON array with fields: type, prompt, options, answer, explanation, difficulty`;
        break;
      case 'generate_mcq':
        prompt = `Generate ${context?.count || 5} multiple-choice questions about: ${context?.topic}\n\nReturn as JSON array with fields: prompt, options (4 choices), answer, explanation`;
        break;
      case 'coding_help':
        prompt = `Help a student understand this coding problem:\n\nQuestion: ${context?.question}\n\nStudent code:\n${context?.code}\n\nProvide guidance without giving the full answer.`;
        break;
      case 'explain_concept':
        prompt = `Explain this concept simply for a secondary school student: ${context?.concept}`;
        break;
      case 'generate_assessment':
        prompt = `Generate a ${context?.questionCount || 10} question assessment for: ${context?.topic}\n\nReturn as JSON with fields: title, description, questions (array of: type, prompt, options, answer, explanation, points)`;
        break;
      case 'generate_assignment':
        prompt = `Generate an assignment for: ${context?.topic}\n\nReturn as JSON with fields: title, description, tasks (array of task descriptions)`;
        break;
      case 'contextual_help':
        prompt = `A student is stuck on: ${context?.topic}\n\nCurrent lesson: ${context?.lessonTitle}\n\nProvide a helpful explanation.`;
        break;
      case 'explain_analytics':
        prompt = `Explain these student analytics in simple terms for a teacher:\n\n${JSON.stringify(context?.analytics)}`;
        break;
      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }

    const response = await callGemini(prompt);
    res.json({ response });
  } catch (err) {
    console.error('AI route error:', err);
    res.status(500).json({ error: 'AI request failed' });
  }
});

// POST /api/ai/recommendations — generate learning recommendations for a student
router.post('/recommendations', requireAuth, async (req, res) => {
  try {
    const { studentId, progressData } = req.body;
    const prompt = `Based on this student's learning progress data, generate 3 personalized study recommendations:\n\n${JSON.stringify(progressData)}\n\nReturn as JSON array with fields: title, description, priority (high/medium/low)`;
    const response = await callGemini(prompt);
    res.json({ recommendations: response });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

export default router;
