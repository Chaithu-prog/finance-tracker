const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protectCoach } = require('../middleware/coachAuth');
const validate = require('../middleware/validate');
const ctrl = require('../controllers/coachAuthController');

router.post('/register',
  [body('name').trim().notEmpty().withMessage('Name required'),
   body('email').isEmail().normalizeEmail(),
   body('password').isLength({ min:6 }).withMessage('Min 6 chars')],
  validate, ctrl.register);

router.post('/login',
  [body('email').isEmail().normalizeEmail(),
   body('password').notEmpty()],
  validate, ctrl.login);

router.get('/me', protectCoach, ctrl.getMe);
router.put('/profile', protectCoach, ctrl.updateProfile);
router.get('/users', protectCoach, ctrl.getAssignedUsers);
router.get('/dashboard-stats', protectCoach, ctrl.getDashboardStats);
router.post('/assign-user',
  protectCoach,
  [body('userEmail').isEmail().withMessage('Valid email required')],
  validate, ctrl.assignUser);
router.delete('/remove-user/:userId', protectCoach, ctrl.removeUser);

module.exports = router;