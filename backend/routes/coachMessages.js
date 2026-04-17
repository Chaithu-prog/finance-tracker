const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect } = require('../middleware/auth');
const { protectCoach } = require('../middleware/coachAuth');
const validate = require('../middleware/validate');
const ctrl = require('../controllers/coachMessageController');

// Middleware to allow either user or coach
const allowUserOrCoach = async (req, res, next) => {
  try {
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      const token = req.headers.authorization.split(' ')[1];
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.role === 'coach') {
        const Coach = require('../models/Coach');
        const coach = await Coach.findById(decoded.id).select('-password');
        if (coach && coach.isActive) {
          req.coach = coach;
          return next();
        }
      } else {
        const User = require('../models/User');
        const user = await User.findById(decoded.id).select('-password');
        if (user && user.isActive) {
          req.user = user;
          return next();
        }
      }
    }
    return res.status(401).json({ message: 'Unauthorized' });
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

router.get('/inbox', protectCoach, ctrl.getCoachInbox);
router.get('/unread', allowUserOrCoach, ctrl.getUnreadCount);
router.get('/coach/:userId', protectCoach, ctrl.getConversation);
router.get('/user/:coachId', protect, ctrl.getConversation);
router.post('/', allowUserOrCoach, [
  body('userId').isMongoId().withMessage('Valid user ID required'),
  body('message').trim().notEmpty().withMessage('Message required')
], validate, ctrl.sendMessage);

module.exports = router;