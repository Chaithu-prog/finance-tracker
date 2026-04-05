const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const ctrl = require('../controllers/supportController');

router.use(protect);

router.get('/', ctrl.getTickets);
router.get('/:id', ctrl.getTicketById);

router.post('/',
  [
    body('subject').trim().notEmpty().withMessage('Subject is required'),
    body('message').trim().notEmpty().withMessage('Message is required'),
  ],
  validate, ctrl.createTicket
);

router.post('/:id/reply',
  [body('message').trim().notEmpty().withMessage('Reply message is required')],
  validate, ctrl.replyToTicket
);

module.exports = router;
