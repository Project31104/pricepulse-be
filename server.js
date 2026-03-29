// server.js — Entry point
// Loads environment variables → connects to MongoDB → starts API server

import 'dotenv/config';
import app from './app.js';
import connectDB from './config/db.js';

const PORT = process.env.PORT || 5000;

let server;

const start = async () => {
  try {
    await connectDB();

    server = app.listen(PORT, () => {
      console.log(`🚀 Backend server running on http://localhost:${PORT}`);
      console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('❌ Server failed to start:', error.message);
    process.exit(1);
  }
};

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

start();