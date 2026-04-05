const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const ctrl = require('../controllers/chatController');

router.use(protect);

router.get('/', ctrl.getMessages);

router.post('/',
  [body('message').trim().notEmpty().withMessage('Message cannot be empty').isLength({ max: 1000 })],
  validate, ctrl.postMessage
);

router.post('/:id/like', ctrl.likeMessage);
router.delete('/:id', ctrl.deleteMessage);

module.exports = router;
