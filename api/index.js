// api/index.js — Vercel serverless entry point
import 'dotenv/config';
import app from '../app.js';
import connectDB from '../config/db.js';

// Connect DB on cold start — cached across warm invocations
let isConnected = false;
if (!isConnected) {
  connectDB()
    .then(() => { isConnected = true; })
    .catch((err) => console.error('DB connection error:', err.message));
}

export default app;
