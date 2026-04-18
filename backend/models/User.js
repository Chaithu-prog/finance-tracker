const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 80 },
  email: { type: String, required: [true, 'Email is required'], unique: true, lowercase: true, trim: true },
  password: { type: String, required: [true, 'Password is required'], minlength: 6, select: false },
  avatar: { type: String, default: '' },
  bio: { type: String, default: '', maxlength: 300 },
  plan: { type: String, enum: ['Free', 'Pro'], default: 'Free' },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date },
  assignedCoach: { type: mongoose.Schema.Types.ObjectId, ref: 'Coach', default: null },
  coachTrialStart: { type: Date, default: null },
  preferences: {
    currency: { type: String, default: 'INR' },
    theme: { type: String, default: 'light' },
    notifications: { type: Boolean, default: true },
    monthlyBudget: { type: Number, default: 0 },
  },
  financialProfile: {
    monthlyIncome: { type: Number, default: 0 },
    savingsTarget: { type: Number, default: 0 },
    riskAppetite: { type: String, enum: ['Low', 'Moderate', 'High'], default: 'Moderate' },
  },
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
