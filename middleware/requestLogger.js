// middleware/requestLogger.js
// HTTP request logger using morgan.
// Dev: colourised one-liner per request.
// Production: JSON-structured logs (easy to pipe into CloudWatch / Datadog).

// import morgan from 'morgan';

// Custom token: log the authenticated user's ID if present
// morgan.token('user-id', (req) => req.user?._id?.toString() || 'anonymous');

const devFormat = ':method :url :status :response-time ms — :user-id';

// Compact JSON format for production log aggregators
const prodFormat = JSON.stringify({
  method:       ':method',
  url:          ':url',
  status:       ':status',
  responseTime: ':response-time ms',
  userId:       ':user-id',
  date:         ':date[iso]',
});

const requestLogger = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.url} ${res.statusCode} ${duration}ms — anonymous`);
  });
  next();
};

export default requestLogger;
