const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const ctrl = require('../controllers/budgetController');

router.use(protect);

router.get('/', ctrl.getBudgets);

router.post('/',
  [
    body('category').trim().notEmpty().withMessage('Category is required'),
    body('limit').isFloat({ min: 1 }).withMessage('Budget limit must be positive'),
  ],
  validate, ctrl.createBudget
);

router.put('/:id', ctrl.updateBudget);
router.delete('/:id', ctrl.deleteBudget);

module.exports = router;
