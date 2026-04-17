const mongoose = require('mongoose');

const coachSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6, select: false },
  avatar: { type: String, default: '' },
  bio: { type: String, default: '', maxlength: 300 },
  specialization: [{ type: String, default: ['Personal Finance'] }],
  assignedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  plan: { type: String, enum: ['Free','Pro'], default: 'Free' },
  isActive: { type: Boolean, default: true },
  lastLogin: Date,
  rating: { type: Number, default: 5.0, min: 1, max: 5 },
  totalStudents: { type: Number, default: 0 },
  tasksCreated: { type: Number, default: 0 },
}, { timestamps: true });

coachSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const bcrypt = require('bcryptjs');
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

coachSchema.methods.matchPassword = async function(enteredPassword) {
  const bcrypt = require('bcryptjs');
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Coach', coachSchema);