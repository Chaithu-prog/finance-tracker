const Coach = require('../models/Coach');
const { generateCoachToken } = require('../middleware/coachAuth');
const Transaction = require('../models/Transaction');

exports.register = async (req, res) => {
  try {
    const { name, email, password, specialization } = req.body;
    const existingCoach = await Coach.findOne({ email });
    if (existingCoach) {
      return res.status(400).json({ message: 'Coach already exists with this email' });
    }
    const specArray = specialization ? specialization.split(',').map(s => s.trim()) : ['Personal Finance'];
    const coach = await Coach.create({ name, email, password, specialization: specArray });
    const token = generateCoachToken(coach._id);
    res.status(201).json({
      success: true,
      data: {
        token,
        coach: {
          id: coach._id,
          name: coach.name,
          email: coach.email,
          plan: coach.plan,
          specialization: coach.specialization
        }
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const coach = await Coach.findOne({ email }).select('+password');
    if (!coach || !(await coach.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    coach.lastLogin = new Date();
    await coach.save();
    const token = generateCoachToken(coach._id);
    res.json({
      success: true,
      data: {
        token,
        coach: {
          id: coach._id,
          name: coach.name,
          email: coach.email,
          plan: coach.plan,
          specialization: coach.specialization,
          avatar: coach.avatar,
          bio: coach.bio,
          totalStudents: coach.totalStudents,
          tasksCreated: coach.tasksCreated,
          rating: coach.rating
        }
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    res.json({ success: true, data: req.coach });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, bio, avatar, specialization } = req.body;
    const specArray = specialization ? specialization.split(',').map(s => s.trim()) : req.coach.specialization;
    const coach = await Coach.findByIdAndUpdate(req.coach._id, { name, bio, avatar, specialization: specArray }, { new: true, runValidators: true });
    res.json({ success: true, data: coach });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAssignedUsers = async (req, res) => {
  try {
    const coach = await Coach.findById(req.coach._id).populate('assignedUsers', 'name email avatar createdAt financialProfile preferences');
    const enriched = await Promise.all(coach.assignedUsers.map(async (user) => {
      const monthlyIncome = await Transaction.aggregate([
        { $match: { user: user._id, type: 'income', date: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      const monthlyExpense = await Transaction.aggregate([
        { $match: { user: user._id, type: 'expense', date: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      const income = monthlyIncome[0]?.total || 0;
      const expense = monthlyExpense[0]?.total || 0;
      const balance = income - expense;
      const savingsRate = income > 0 ? ((balance / income) * 100).toFixed(1) : 0;
      return {
        user,
        monthlyIncome: income,
        monthlyExpense: expense,
        balance,
        savingsRate: parseFloat(savingsRate)
      };
    }));
    res.json({ success: true, data: enriched });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.assignUser = async (req, res) => {
  try {
    const { userEmail } = req.body;
    const User = require('../models/User');
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const coach = await Coach.findById(req.coach._id);
    if (coach.assignedUsers.includes(user._id)) {
      return res.status(400).json({ message: 'User already assigned' });
    }
    // Update coach's assigned users
    coach.assignedUsers.push(user._id);
    coach.totalStudents += 1;
    await coach.save();
    
    // Update user's assigned coach
    user.assignedCoach = req.coach._id;
    user.coachTrialStart = new Date();
    await user.save();
    
    res.json({ success: true, data: coach });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.removeUser = async (req, res) => {
  try {
    const coach = await Coach.findById(req.coach._id);
    coach.assignedUsers = coach.assignedUsers.filter(id => id.toString() !== req.params.userId);
    coach.totalStudents = Math.max(0, coach.totalStudents - 1);
    await coach.save();    
    // Clear user's assigned coach
    const User = require('../models/User');
    await User.findByIdAndUpdate(req.params.userId, { assignedCoach: null, coachTrialStart: null });
        res.json({ success: true, message: 'User removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getDashboardStats = async (req, res) => {
  try {
    const coachId = req.coach._id;
    const coach = await Coach.findById(coachId);
    const totalStudents = coach.totalStudents;
    const Task = require('../models/Task');
    const activeTasks = await Task.countDocuments({ coach: coachId, status: { $in: ['assigned', 'in-progress', 'submitted'] } });
    const pendingReviews = await Task.countDocuments({ coach: coachId, status: 'submitted' });
    const CoachMessage = require('../models/CoachMessage');
    const unreadMessages = await CoachMessage.countDocuments({ coach: coachId, sender: 'user', isRead: false });
    const CoachSession = require('../models/CoachSession');
    const sessionsThisMonth = await CoachSession.countDocuments({
      coach: coachId,
      scheduledAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
    });
    const topStudents = await Coach.findById(coachId).populate('assignedUsers', 'name email').then(async (coach) => {
      const enriched = await Promise.all(coach.assignedUsers.map(async (user) => {
        const monthlyIncome = await Transaction.aggregate([
          { $match: { user: user._id, type: 'income', date: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const monthlyExpense = await Transaction.aggregate([
          { $match: { user: user._id, type: 'expense', date: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const income = monthlyIncome[0]?.total || 0;
        const expense = monthlyExpense[0]?.total || 0;
        const savingsRate = income > 0 ? ((income - expense) / income * 100).toFixed(1) : 0;
        return { user, savingsRate: parseFloat(savingsRate) };
      }));
      return enriched.sort((a,b) => b.savingsRate - a.savingsRate).slice(0,3);
    });
    const recentStudents = await Coach.findById(coachId).populate('assignedUsers', 'name email avatar').then(c => c.assignedUsers.slice(0,3).map(u => ({ user: u, monthlyIncome: 0, monthlyExpense: 0 })));
    const pendingTasks = await Task.find({ coach: coachId, status: 'submitted' }).populate('user', 'name').limit(3);
    res.json({
      success: true,
      data: {
        totalStudents,
        activeTasks,
        pendingReviews,
        unreadMessages,
        sessionsThisMonth,
        topStudents,
        recentStudents,
        pendingTasks
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};