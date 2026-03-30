// api/index.js — Vercel serverless entry point (CommonJS wrapper)
const path = require('path');

// Load .env relative to backend root
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

let appPromise = null;

function getApp() {
  if (!appPromise) {
    appPromise = Promise.all([
      import('../app.js'),
      import('../config/db.js'),
    ]).then(([{ default: app }, { default: connectDB }]) => {
      return connectDB()
        .then(() => app)
        .catch((err) => {
          console.error('DB connection error:', err.message);
          return app; // still serve even if DB fails (returns errors gracefully)
        });
    });
  }
  return appPromise;
}

module.exports = async (req, res) => {
  const app = await getApp();
  app(req, res);
};
