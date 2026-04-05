const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const ctrl = require('../controllers/transactionController');

router.use(protect);

router.get('/', ctrl.getTransactions);
router.get('/summary', ctrl.getSummary);
router.get('/top-categories', ctrl.getTopCategories);

router.post('/',
  [
    body('type').isIn(['income', 'expense']).withMessage('Type must be income or expense'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
    body('category').trim().notEmpty().withMessage('Category is required'),
    body('date').isISO8601().withMessage('Valid date is required'),
  ],
  validate, ctrl.createTransaction
);

router.put('/:id',
  [
    body('amount').optional().isFloat({ min: 0.01 }).withMessage('Amount must be positive'),
  ],
  validate, ctrl.updateTransaction
);

router.delete('/:id', ctrl.deleteTransaction);

module.exports = router;
