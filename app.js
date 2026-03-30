// ============================================================
// app.js — Express application factory
// ============================================================
// This file creates and configures the Express app:
//   - Registers global middleware (CORS, JSON parsing, logging, rate limiting)
//   - Mounts all API route groups under /api
//   - Adds the health-check endpoint
//   - Attaches the centralised error handler (must be last)
//
// Keeping this separate from server.js makes it easy to import
// the app in automated tests without actually starting a server.

import express from 'express';
import cors from 'cors';
import requestLogger from './middleware/requestLogger.js';
import errorMiddleware from './middleware/errorMiddleware.js';
import { generalLimiter } from './config/rateLimiter.js';

// Route modules — each file handles one resource group
import authRoutes         from './routes/authRoutes.js';
import userRoutes         from './routes/userRoutes.js';
import productRoutes      from './routes/productRoutes.js';
import historyRoutes      from './routes/historyRoutes.js';
import priceHistoryRoutes from './routes/priceHistoryRoutes.js';

const app = express();

// Required for Vercel / reverse proxies — trust X-Forwarded-* headers
// so req.ip returns the real client IP instead of the proxy IP
app.set('trust proxy', 1);

// ── CORS ──────────────────────────────────────────────────────────────────────
// CORS (Cross-Origin Resource Sharing) controls which domains can call this API.
// Without this, the browser would block requests from the React frontend.
app.use(cors({
  origin: (origin, callback) => {
    const allowed = (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map(s => s.trim());
    // Allow frontend origins, Chrome extensions, and no-origin requests (curl, Postman)
    if (!origin || allowed.includes(origin) || origin.startsWith('chrome-extension://')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

// ── Body parsers ──────────────────────────────────────────────────────────────
// Parse incoming JSON bodies (e.g. POST /api/auth/login sends { email, password })
// The 10kb limit rejects oversized payloads to prevent abuse
app.use(express.json({ limit: '10kb' }));
// Parse URL-encoded form data (e.g. traditional HTML form submissions)
app.use(express.urlencoded({ extended: false }));

// ── Request logger ────────────────────────────────────────────────────────────
// Logs every incoming request to the console so developers can see traffic
app.use(requestLogger);

// ── Global rate limiter ───────────────────────────────────────────────────────
// Limits each IP to 100 requests per 15 minutes across all /api routes.
// Prevents bots and abusive clients from hammering the server.
app.use('/api', generalLimiter);

// ── Route mounting ────────────────────────────────────────────────────────────
// Each router handles a specific group of endpoints:
//   /api/auth     → register, login
//   /api/users    → user profile management
//   /api/products → search, compare, trending
//   /api/history  → search history for logged-in users
app.use('/api/auth',     authRoutes);
app.use('/api/users',    userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/history',  historyRoutes);
// Price history snapshots — used by the browser extension
app.use('/api/products', priceHistoryRoutes);

// ── Health check ──────────────────────────────────────────────────────────────
// Simple endpoint used by the frontend and Chrome extension to verify the
// backend is reachable before making real API calls.
// Returns: { success, status, message, env, time }
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status:  'OK',
    message: 'PricePulse API is running',
    env:     process.env.NODE_ENV,
    time:    new Date().toISOString(),
  });
});

// ── Centralised error handler ─────────────────────────────────────────────────
// MUST be registered last. Any controller that calls next(error) ends up here.
// This middleware formats the error into a consistent JSON response.
app.use(errorMiddleware);

export default app;
