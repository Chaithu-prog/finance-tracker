const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protectCoach } = require('../middleware/coachAuth');
const validate = require('../middleware/validate');
const ctrl = require('../controllers/coachNoteController');

router.get('/:userId', protectCoach, ctrl.getNotes);
router.post('/:userId', protectCoach, [
  body('content').trim().notEmpty().withMessage('Content required')
], validate, ctrl.createNote);
router.put('/:id', protectCoach, ctrl.updateNote);
router.delete('/:id', protectCoach, ctrl.deleteNote);

module.exports = router;