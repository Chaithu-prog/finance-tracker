const mongoose = require('mongoose');

const supportSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subject: { type: String, required: true, trim: true, maxlength: 200 },
  category: { type: String, enum: ['Technical', 'Billing', 'Feature Request', 'Bug Report', 'Account', 'Other'], default: 'Other' },
  priority: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium' },
  status: { type: String, enum: ['open', 'in-progress', 'resolved', 'closed'], default: 'open' },
  messages: [{
    sender: { type: String, enum: ['user', 'support'], default: 'user' },
    content: { type: String, required: true, maxlength: 2000 },
    createdAt: { type: Date, default: Date.now },
  }],
  resolvedAt: { type: Date },
}, { timestamps: true });

supportSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model('Support', supportSchema);
