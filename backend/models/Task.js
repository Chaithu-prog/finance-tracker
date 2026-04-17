const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  coach: { type: mongoose.Schema.Types.ObjectId, ref: 'Coach', required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, maxlength: 1000, default: '' },
  category: { type: String, enum: ['Saving','Budgeting','Investing','Debt Reduction','Income Growth','Credit Management','Smart Spending','Emergency Fund'], default: 'Saving' },
  difficulty: { type: String, enum: ['Easy','Medium','Hard'], default: 'Medium' },
  dueDate: { type: Date, required: true },
  status: { type: String, enum: ['assigned','in-progress','submitted','approved','rejected'], default: 'assigned' },
  points: { type: Number, default: 10, min: 5, max: 100 },
  submissionNote: { type: String, maxlength: 500, default: '' },
  submissionDate: Date,
  coachFeedback: { type: String, maxlength: 500, default: '' },
  isTemplate: { type: Boolean, default: false },
  priority: { type: String, enum: ['Low','Normal','High'], default: 'Normal' },
}, { timestamps: true });

taskSchema.index({ user: 1, status: 1 });
taskSchema.index({ coach: 1, createdAt: -1 });
taskSchema.index({ user: 1, dueDate: 1 });

module.exports = mongoose.model('Task', taskSchema);