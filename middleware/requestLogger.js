// ============================================================
// middleware/requestLogger.js — HTTP request logger
// ============================================================
// Logs every incoming HTTP request to the console so developers
// can see what the server is receiving in real time.
//
// Example output:
//   GET /api/products/search?q=iphone 200 142ms — anonymous
//
// This runs for EVERY request before it reaches any route handler.

const requestLogger = (req, res, next) => {
  // Record the time the request arrived
  const start = Date.now();

  // 'finish' fires after the response has been fully sent to the client.
  // At that point we know the status code and how long it took.
  res.on('finish', () => {
    const duration = Date.now() - start; // total time in milliseconds
    console.log(`${req.method} ${req.url} ${res.statusCode} ${duration}ms — anonymous`);
  });

  // Pass control to the next middleware or route handler
  next();
};

export default requestLogger;
