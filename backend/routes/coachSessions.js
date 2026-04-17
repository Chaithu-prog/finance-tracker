const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect } = require('../middleware/auth');
const { protectCoach } = require('../middleware/coachAuth');
const validate = require('../middleware/validate');
const ctrl = require('../controllers/coachSessionController');

router.get('/', protectCoach, ctrl.getSessions);
router.get('/user', protect, ctrl.getUserSessions);
router.post('/', protectCoach, [
  body('userId').isMongoId().withMessage('Valid user ID required'),
  body('scheduledAt').isISO8601().withMessage('Valid date required')
], validate, ctrl.createSession);
router.put('/:id', protectCoach, ctrl.updateSession);
router.delete('/:id', protectCoach, ctrl.deleteSession);

module.exports = router;