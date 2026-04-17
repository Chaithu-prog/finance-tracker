const Task = require('../models/Task');
const Coach = require('../models/Coach');

exports.getMyTasks = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = { user: req.user._id };
    if (status) query.status = status;
    const tasks = await Task.find(query)
      .populate('coach', 'name avatar specialization')
      .sort({ dueDate: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    const total = await Task.countDocuments(query);
    res.json({ success: true, data: tasks, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getCoachTasks = async (req, res) => {
  try {
    const { status, userId, page = 1, limit = 20 } = req.query;
    const query = { coach: req.coach._id };
    if (status) query.status = status;
    if (userId) query.user = userId;
    const tasks = await Task.find(query)
      .populate('user', 'name email avatar')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    const total = await Task.countDocuments(query);
    res.json({ success: true, data: tasks, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createTask = async (req, res) => {
  try {
    const { userId, title, description, category, difficulty, dueDate, points } = req.body;
    const coach = await Coach.findById(req.coach._id);
    if (!coach.assignedUsers.includes(userId)) {
      return res.status(403).json({ message: 'User not assigned to this coach' });
    }
    const task = await Task.create({
      coach: req.coach._id,
      user: userId,
      title,
      description,
      category,
      difficulty,
      dueDate,
      points: points || 10
    });
    coach.tasksCreated += 1;
    await coach.save();
    res.status(201).json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateTask = async (req, res) => {
  try {
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, coach: req.coach._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    res.json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.submitTask = async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user._id });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    if (!['assigned', 'in-progress'].includes(task.status)) {
      return res.status(400).json({ message: 'Task cannot be submitted in current status' });
    }
    task.status = 'submitted';
    task.submissionNote = req.body.submissionNote;
    task.submissionDate = new Date();
    await task.save();
    res.json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.approveTask = async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, coach: req.coach._id });
    if (!task || task.status !== 'submitted') {
      return res.status(400).json({ message: 'Task not eligible for approval' });
    }
    task.status = 'approved';
    task.coachFeedback = req.body.coachFeedback;
    await task.save();
    res.json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.rejectTask = async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, coach: req.coach._id });
    if (!task || task.status !== 'submitted') {
      return res.status(400).json({ message: 'Task not eligible for rejection' });
    }
    if (!req.body.coachFeedback) {
      return res.status(400).json({ message: 'Feedback required for rejection' });
    }
    task.status = 'rejected';
    task.coachFeedback = req.body.coachFeedback;
    await task.save();
    res.json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, coach: req.coach._id });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    res.json({ success: true, message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getTaskStats = async (req, res) => {
  try {
    const stats = await Task.aggregate([
      { $match: { coach: req.coach._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const byStatus = stats.reduce((acc, s) => { acc[s._id] = s.count; return acc; }, {});
    const catStats = await Task.aggregate([
      { $match: { coach: req.coach._id } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);
    const byCategory = catStats.reduce((acc, c) => { acc[c._id] = c.count; return acc; }, {});
    const total = await Task.countDocuments({ coach: req.coach._id });
    const completionRate = total > 0 ? ((byStatus.approved || 0) / total * 100).toFixed(1) : 0;
    res.json({ success: true, data: { byStatus, byCategory, total, completionRate: parseFloat(completionRate) } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.startTask = async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user._id, status: 'assigned' });
    if (!task) {
      return res.status(404).json({ message: 'Task not found or not assignable' });
    }
    task.status = 'in-progress';
    await task.save();
    res.json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};