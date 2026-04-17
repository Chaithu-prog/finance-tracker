const mongoose = require('mongoose');

const coachSessionSchema = new mongoose.Schema({
  coach: { type: mongoose.Schema.Types.ObjectId, ref: 'Coach', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  scheduledAt: { type: Date, required: true },
  duration: { type: Number, default: 30 },
  type: { type: String, enum: ['Video Call','Audio Call','Chat Session'], default: 'Chat Session' },
  status: { type: String, enum: ['scheduled','completed','cancelled'], default: 'scheduled' },
  notes: { type: String, maxlength: 1000, default: '' },
  meetingLink: { type: String, default: '' },
  agendaItems: [{ type: String }],
  studentRating: { type: Number, min: 1, max: 5 },
}, { timestamps: true });

module.exports = mongoose.model('CoachSession', coachSessionSchema);