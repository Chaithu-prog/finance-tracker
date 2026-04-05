const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  category: { type: String, required: true, trim: true },
  limit: { type: Number, required: true, min: 0 },
  spent: { type: Number, default: 0, min: 0 },
  period: { type: String, enum: ['monthly', 'weekly', 'yearly'], default: 'monthly' },
  month: { type: Number, min: 1, max: 12 },
  year: { type: Number },
  icon: { type: String, default: '💰' },
  color: { type: String, default: '#3d7264' },
  alertAt: { type: Number, default: 80 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

budgetSchema.index({ user: 1, category: 1, month: 1, year: 1 });

module.exports = mongoose.model('Budget', budgetSchema);
