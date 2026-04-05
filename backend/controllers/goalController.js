const Goal = require('../models/Goal');

exports.getGoals = async (req, res) => {
  try {
    const goals = await Goal.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, data: goals });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createGoal = async (req, res) => {
  try {
    const goal = await Goal.create({ ...req.body, user: req.user._id });
    res.status(201).json({ success: true, message: 'Goal created.', data: goal });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateGoal = async (req, res) => {
  try {
    const goal = await Goal.findOne({ _id: req.params.id, user: req.user._id });
    if (!goal) return res.status(404).json({ success: false, message: 'Goal not found.' });
    Object.assign(goal, req.body);
    if (goal.currentAmount >= goal.targetAmount) goal.status = 'completed';
    await goal.save();
    res.json({ success: true, message: 'Goal updated.', data: goal });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.addContribution = async (req, res) => {
  try {
    const { amount, note } = req.body;
    const goal = await Goal.findOne({ _id: req.params.id, user: req.user._id });
    if (!goal) return res.status(404).json({ success: false, message: 'Goal not found.' });
    goal.contributions.push({ amount, note });
    goal.currentAmount += amount;
    if (goal.currentAmount >= goal.targetAmount) goal.status = 'completed';
    await goal.save();
    res.json({ success: true, message: 'Contribution added.', data: goal });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteGoal = async (req, res) => {
  try {
    const goal = await Goal.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!goal) return res.status(404).json({ success: false, message: 'Goal not found.' });
    res.json({ success: true, message: 'Goal deleted.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
