require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');

const app = express();

app.use(helmet());
const defaultClient = process.env.CLIENT_URL || 'http://localhost:5173';
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (origin === defaultClient) return callback(null, true);
      if (process.env.NODE_ENV !== 'production' && /^http:\/\/localhost:\d+$/.test(origin)) {
        return callback(null, true);
      }
      callback(null, false);
    },
    credentials: true,
  }),
);
app.use(express.json());

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  // Dev: Vite HMR + React Strict Mode + refetches burn through 100/15min quickly → 429.
  max: process.env.NODE_ENV === 'production' ? 100 : 2000,
  standardHeaders: true,
  legacyHeaders: false,
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// All /api/v1 routes behind one mount + rate limit (Express 4.x; predictable routing).
const apiV1 = require('./routes/api.v1.routes');
app.use('/api/v1', apiLimiter, apiV1);

// JSON 404 for API (distinguishes this app from another process on the same port).
app.use((req, res, next) => {
  if (req.originalUrl.startsWith('/api')) {
    return res.status(404).json({ message: 'Not found', path: req.originalUrl });
  }
  next();
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

const PORT = Number(process.env.PORT) || 5001;

async function start() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
  });
}

start();
