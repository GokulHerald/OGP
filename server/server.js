require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  }),
);
app.use(express.json());

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', apiLimiter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/v1/auth', require('./routes/auth.routes'));
app.use('/api/v1/tournaments', require('./routes/tournament.routes'));
app.use('/api/v1/matches', require('./routes/match.routes'));
app.use('/api/v1/leaderboard', require('./routes/leaderboard.routes'));

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
