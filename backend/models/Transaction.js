const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['income', 'expense'], required: true },
  amount: { type: Number, required: true, min: 0 },
  category: { type: String, required: true, trim: true },
  subcategory: { type: String, default: '', trim: true },
  description: { type: String, default: '', trim: true, maxlength: 300 },
  date: { type: Date, required: true, default: Date.now },
  paymentMethod: { type: String, enum: ['Cash', 'UPI', 'Card', 'NetBanking', 'Wallet', 'Other'], default: 'UPI' },
  tags: [{ type: String, trim: true }],
  isRecurring: { type: Boolean, default: false },
  recurringPeriod: { type: String, enum: ['daily', 'weekly', 'monthly', 'yearly', ''], default: '' },
  attachmentUrl: { type: String, default: '' },
  note: { type: String, default: '', maxlength: 500 },
}, { timestamps: true });

transactionSchema.index({ user: 1, date: -1 });
transactionSchema.index({ user: 1, type: 1 });
transactionSchema.index({ user: 1, category: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
