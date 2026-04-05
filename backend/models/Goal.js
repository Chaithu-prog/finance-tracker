const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, default: '', maxlength: 400 },
  targetAmount: { type: Number, required: true, min: 1 },
  currentAmount: { type: Number, default: 0, min: 0 },
  deadline: { type: Date, required: true },
  category: { type: String, enum: ['Emergency Fund', 'Travel', 'Education', 'Home', 'Vehicle', 'Wedding', 'Retirement', 'Business', 'Other'], default: 'Other' },
  icon: { type: String, default: '🎯' },
  color: { type: String, default: '#3d7264' },
  status: { type: String, enum: ['active', 'completed', 'paused', 'cancelled'], default: 'active' },
  contributions: [{
    amount: Number,
    date: { type: Date, default: Date.now },
    note: String,
  }],
  priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
}, { timestamps: true });

goalSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model('Goal', goalSchema);
