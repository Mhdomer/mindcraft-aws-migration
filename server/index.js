import 'dotenv/config';
import { validateEnv } from './config/env.js';
validateEnv();

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { rateLimit } from 'express-rate-limit';
import { logger, morganStream } from './logger.js';
import { connectDB } from './config/database.js';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import courseRoutes from './routes/courses.js';
import moduleRoutes from './routes/modules.js';
import lessonRoutes from './routes/lessons.js';
import exerciseRoutes from './routes/exercises.js';
import enrollmentRoutes from './routes/enrollments.js';
import assignmentRoutes from './routes/assignments.js';
import assessmentRoutes from './routes/assessments.js';
import submissionRoutes from './routes/submissions.js';
import notificationRoutes from './routes/notifications.js';
import forumRoutes from './routes/forum.js';
import aiRoutes from './routes/ai.js';
import gameLevelRoutes from './routes/gameLevels.js';

const app = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';

await connectDB();

// ─── Security Headers ─────────────────────────────────────────────────────────
app.use(helmet());

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Request Logging ──────────────────────────────────────────────────────────
app.use(morgan(isProd ? 'combined' : 'dev', { stream: isProd ? morganStream : undefined }));

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// ─── Rate Limiting ────────────────────────────────────────────────────────────
// Strict limit on auth endpoints to slow down brute-force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API rate limit — generous for normal use
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth', authLimiter);
app.use('/api/', apiLimiter);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/modules', moduleRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/forum', forumRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/game-levels', gameLevelRoutes);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), env: process.env.NODE_ENV });
});

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // Never leak stack traces to the client in production
  const message = isProd ? 'Internal server error' : err.message;
  logger.error(`${req.method} ${req.path}`, { status: err.status, message: err.message });
  res.status(err.status || 500).json({ error: message });
});

app.listen(PORT, () => {
  logger.info(`MindCraft API running on port ${PORT}`, { env: process.env.NODE_ENV });
});
