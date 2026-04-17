const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect } = require('../middleware/auth');
const { protectCoach } = require('../middleware/coachAuth');
const validate = require('../middleware/validate');
const ctrl = require('../controllers/taskController');

router.get('/', protect, ctrl.getMyTasks);
router.get('/coach', protectCoach, ctrl.getCoachTasks);
router.get('/coach/stats', protectCoach, ctrl.getTaskStats);
router.post('/', protectCoach, [
  body('userId').isMongoId().withMessage('Valid user ID required'),
  body('title').trim().notEmpty().withMessage('Title required'),
  body('dueDate').isISO8601().withMessage('Valid due date required')
], validate, ctrl.createTask);
router.put('/:id', protectCoach, ctrl.updateTask);
router.post('/:id/start', protect, ctrl.startTask);
router.post('/:id/submit', protect, [body('submissionNote').trim()], ctrl.submitTask);
router.post('/:id/approve', protectCoach, ctrl.approveTask);
router.post('/:id/reject', protectCoach, [body('coachFeedback').notEmpty().withMessage('Feedback required')], validate, ctrl.rejectTask);
router.delete('/:id', protectCoach, ctrl.deleteTask);

module.exports = router;