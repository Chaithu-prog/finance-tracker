const mongoose = require('mongoose');

const coachNoteSchema = new mongoose.Schema({
  coach: { type: mongoose.Schema.Types.ObjectId, ref: 'Coach', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true, maxlength: 2000 },
  category: { type: String, enum: ['Observation','Goal','Risk','Action Item','Milestone'], default: 'Observation' },
  isPrivate: { type: Boolean, default: true },
}, { timestamps: true });

coachNoteSchema.index({ coach: 1, user: 1 });

module.exports = mongoose.model('CoachNote', coachNoteSchema);