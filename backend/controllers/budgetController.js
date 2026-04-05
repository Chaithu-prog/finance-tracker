const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');

exports.getBudgets = async (req, res) => {
  try {
    const now = new Date();
    const month = parseInt(req.query.month) || now.getMonth() + 1;
    const year = parseInt(req.query.year) || now.getFullYear();

    const budgets = await Budget.find({ user: req.user._id, month, year, isActive: true });

    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);

    const spending = await Transaction.aggregate([
      { $match: { user: req.user._id, type: 'expense', date: { $gte: startOfMonth, $lte: endOfMonth } } },
      { $group: { _id: '$category', spent: { $sum: '$amount' } } },
    ]);

    const spendingMap = {};
    spending.forEach(s => { spendingMap[s._id] = s.spent; });

    const result = budgets.map(b => ({
      ...b.toObject(),
      spent: spendingMap[b.category] || 0,
      percentage: Math.min(100, Math.round(((spendingMap[b.category] || 0) / b.limit) * 100)),
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createBudget = async (req, res) => {
  try {
    const now = new Date();
    const month = req.body.month || now.getMonth() + 1;
    const year = req.body.year || now.getFullYear();
    const existing = await Budget.findOne({ user: req.user._id, category: req.body.category, month, year });
    if (existing) return res.status(400).json({ success: false, message: 'Budget for this category already exists this month.' });
    const budget = await Budget.create({ ...req.body, user: req.user._id, month, year });
    res.status(201).json({ success: true, message: 'Budget created.', data: budget });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateBudget = async (req, res) => {
  try {
    const budget = await Budget.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { $set: req.body },
      { new: true }
    );
    if (!budget) return res.status(404).json({ success: false, message: 'Budget not found.' });
    res.json({ success: true, message: 'Budget updated.', data: budget });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteBudget = async (req, res) => {
  try {
    const budget = await Budget.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!budget) return res.status(404).json({ success: false, message: 'Budget not found.' });
    res.json({ success: true, message: 'Budget deleted.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
