require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');

const app = express();

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error('❌ Unhandled Rejection:', err);
  process.exit(1);
});

connectDB();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});
app.use('/api/', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

app.use('/api/auth', require('./routes/auth'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/goals', require('./routes/goals'));
app.use('/api/budgets', require('./routes/budgets'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/support', require('./routes/support'));

app.use('/api/coach/auth', require('./routes/coachAuth'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/coach-messages', require('./routes/coachMessages'));
app.use('/api/coach-sessions', require('./routes/coachSessions'));
app.use('/api/coach-notes', require('./routes/coachNotes'));

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'FinFolio API is running.', timestamp: new Date().toISOString() });
});

app.use(express.static(path.join(__dirname, '../frontend')));
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
  } else {
    res.status(404).json({ success: false, message: 'API route not found.' });
  }
});

app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error.' : err.message,
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 FinFolio server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});
