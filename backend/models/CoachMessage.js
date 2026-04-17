const mongoose = require('mongoose');

const coachMessageSchema = new mongoose.Schema({
  coach: { type: mongoose.Schema.Types.ObjectId, ref: 'Coach', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sender: { type: String, enum: ['coach','user'], required: true },
  message: { type: String, required: true, trim: true, maxlength: 1000 },
  isRead: { type: Boolean, default: false },
  messageType: { type: String, enum: ['text','tip','alert','task-update','milestone'], default: 'text' },
  metadata: { type: Object, default: {} },
}, { timestamps: true });

coachMessageSchema.index({ coach: 1, user: 1, createdAt: -1 });
coachMessageSchema.index({ coach: 1, user: 1, isRead: 1 });

module.exports = mongoose.model('CoachMessage', coachMessageSchema);