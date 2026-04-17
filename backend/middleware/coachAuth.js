const jwt = require('jsonwebtoken');
const Coach = require('../models/Coach');

const protectCoach = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
      return res.status(401).json({ message: 'Not authorized. No token provided.' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'coach') {
      return res.status(401).json({ message: 'Invalid coach token.' });
    }
    const coach = await Coach.findById(decoded.id).select('-password');
    if (!coach || !coach.isActive) {
      return res.status(401).json({ message: 'Coach not found or inactive.' });
    }
    req.coach = coach;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Session expired. Please login again.' });
    }
    return res.status(500).json({ message: 'Server error' });
  }
};

const generateCoachToken = (id) => {
  return jwt.sign({ id, role: 'coach' }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

module.exports = { protectCoach, generateCoachToken };