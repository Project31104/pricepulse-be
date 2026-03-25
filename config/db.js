// config/db.js — Mongoose connection with lifecycle event logging

import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // These are the recommended options for Mongoose 8+
      serverSelectionTimeoutMS: 5000, // fail fast if DB unreachable
    });

    console.log(`✅ MongoDB connected: ${conn.connection.host}`);

    // Log when connection drops so we know immediately in production
    mongoose.connection.on('disconnected', () =>
      console.warn('⚠️  MongoDB disconnected')
    );
    mongoose.connection.on('reconnected', () =>
      console.log('✅ MongoDB reconnected')
    );
  } catch (error) {
    console.error(`❌ MongoDB connection failed: ${error.message}`);
    process.exit(1); // crash fast — let the process manager restart
  }
};

export default connectDB;
