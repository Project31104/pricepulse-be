// app.js
// Express application setup — middleware stack + route mounting.
// Kept separate from server.js so it's easy to import in tests.

import express from 'express';
import cors from 'cors';
import requestLogger from './middleware/requestLogger.js';
import errorMiddleware from './middleware/errorMiddleware.js';
import { generalLimiter } from './config/rateLimiter.js';

// Routes
import authRoutes    from './routes/authRoutes.js';
import userRoutes    from './routes/userRoutes.js';
import productRoutes from './routes/productRoutes.js';
import historyRoutes from './routes/historyRoutes.js';

const app = express();

// ── Security & Parsing ────────────────────────────────────────────────────────
app.use(cors({
  origin:      process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  methods:     ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));
app.use(express.json({ limit: '10kb' }));       // reject oversized payloads
app.use(express.urlencoded({ extended: false }));

// ── Logging ───────────────────────────────────────────────────────────────────
app.use(requestLogger);

// ── Global rate limiter (applied to all routes) ───────────────────────────────
app.use('/api', generalLimiter);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/users',    userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/history',  historyRoutes);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status:  'OK',
    message: 'PricePulse API is running',
    env:     process.env.NODE_ENV,
    time:    new Date().toISOString(),
  });
});

// Error handling middleware (must be last)
app.use(errorMiddleware);

export default app;