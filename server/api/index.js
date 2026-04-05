require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('../config/db');

const app = express();

let dbConnected = false;

async function ensureDB() {
  if (!dbConnected) {
    await connectDB();
    dbConnected = true;
  }
}

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
  max: process.env.NODE_ENV === 'production' ? 100 : 2000,
  standardHeaders: true,
  legacyHeaders: false,
});

app.get('/health', async (req, res) => {
  await ensureDB();
  res.json({ status: 'ok' });
});

const apiV1 = require('../routes/api.v1.routes');
app.use('/api/v1', apiLimiter, apiV1);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

module.exports = app;
