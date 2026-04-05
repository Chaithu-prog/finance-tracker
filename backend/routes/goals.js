const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const ctrl = require('../controllers/goalController');

router.use(protect);

router.get('/', ctrl.getGoals);

router.post('/',
  [
    body('title').trim().notEmpty().withMessage('Goal title is required'),
    body('targetAmount').isFloat({ min: 1 }).withMessage('Target amount must be positive'),
    body('deadline').isISO8601().withMessage('Valid deadline is required'),
  ],
  validate, ctrl.createGoal
);

router.put('/:id', ctrl.updateGoal);

router.post('/:id/contribute',
  [body('amount').isFloat({ min: 0.01 }).withMessage('Contribution amount must be positive')],
  validate, ctrl.addContribution
);

router.delete('/:id', ctrl.deleteGoal);

module.exports = router;
