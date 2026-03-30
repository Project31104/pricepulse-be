// ============================================================
// config/db.js — MongoDB connection setup
// ============================================================
// Exports a single async function `connectDB` that:
//   1. Opens a Mongoose connection to the MongoDB URI in .env
//   2. Logs success or failure
//   3. Listens for disconnect/reconnect events so we know
//      immediately if the database goes offline in production

import mongoose from 'mongoose';

let isConnected = false;

const connectDB = async () => {
  if (isConnected) return; // reuse existing connection

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    isConnected = true;
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);

    mongoose.connection.on('disconnected', () => {
      isConnected = false;
      console.warn('⚠️  MongoDB disconnected');
    });
    mongoose.connection.on('reconnected', () => {
      isConnected = true;
      console.log('✅ MongoDB reconnected');
    });
  } catch (error) {
    console.error(`❌ MongoDB connection failed: ${error.message}`);
    // Do NOT call process.exit(1) — let the server keep running
    // so health checks still respond and we can debug via logs
  }
};

export default connectDB;
