// ============================================================
// config/db.js — MongoDB connection setup
// ============================================================
// Exports a single async function `connectDB` that:
//   1. Opens a Mongoose connection to the MongoDB URI in .env
//   2. Logs success or failure
//   3. Listens for disconnect/reconnect events so we know
//      immediately if the database goes offline in production

import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    // mongoose.connect() returns a connection object we can inspect
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // If MongoDB is unreachable, fail after 5 seconds instead of hanging forever
      serverSelectionTimeoutMS: 5000,
    });

    // Log which host we connected to (useful when using MongoDB Atlas clusters)
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);

    // Listen for future disconnection events (e.g. network blip, DB restart)
    mongoose.connection.on('disconnected', () =>
      console.warn('⚠️  MongoDB disconnected')
    );

    // Log when Mongoose automatically re-establishes the connection
    mongoose.connection.on('reconnected', () =>
      console.log('✅ MongoDB reconnected')
    );
  } catch (error) {
    console.error(`❌ MongoDB connection failed: ${error.message}`);
    // Exit the process so the server doesn't run without a database.
    // A process manager (PM2, Docker) will restart it automatically.
    process.exit(1);
  }
};

export default connectDB;
