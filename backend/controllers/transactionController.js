const Transaction = require('../models/Transaction');

exports.getTransactions = async (req, res) => {
  try {
    const { type, category, startDate, endDate, page = 1, limit = 20, search } = req.query;
    const filter = { user: req.user._id };
    if (type) filter.type = type;
    if (category) filter.category = category;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }
    if (search) filter.description = { $regex: search, $options: 'i' };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [transactions, total] = await Promise.all([
      Transaction.find(filter).sort({ date: -1 }).skip(skip).limit(parseInt(limit)),
      Transaction.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: transactions,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createTransaction = async (req, res) => {
  try {
    const tx = await Transaction.create({ ...req.body, user: req.user._id });
    res.status(201).json({ success: true, message: 'Transaction added.', data: tx });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateTransaction = async (req, res) => {
  try {
    const tx = await Transaction.findOne({ _id: req.params.id, user: req.user._id });
    if (!tx) return res.status(404).json({ success: false, message: 'Transaction not found.' });
    Object.assign(tx, req.body);
    await tx.save();
    res.json({ success: true, message: 'Transaction updated.', data: tx });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteTransaction = async (req, res) => {
  try {
    const tx = await Transaction.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!tx) return res.status(404).json({ success: false, message: 'Transaction not found.' });
    res.json({ success: true, message: 'Transaction deleted.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSummary = async (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [summary, monthly, categoryBreakdown] = await Promise.all([
      Transaction.aggregate([
        { $match: { user: userId, date: { $gte: startOfMonth } } },
        { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      Transaction.aggregate([
        { $match: { user: userId } },
        { $group: { _id: { year: { $year: '$date' }, month: { $month: '$date' }, type: '$type' }, total: { $sum: '$amount' } } },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
        { $limit: 24 },
      ]),
      Transaction.aggregate([
        { $match: { user: userId, date: { $gte: startOfMonth }, type: 'expense' } },
        { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } },
        { $limit: 8 },
      ]),
    ]);

    const income = summary.find(s => s._id === 'income') || { total: 0, count: 0 };
    const expense = summary.find(s => s._id === 'expense') || { total: 0, count: 0 };

    res.json({
      success: true,
      data: {
        monthlyIncome: income.total,
        monthlyExpense: expense.total,
        balance: income.total - expense.total,
        incomeCount: income.count,
        expenseCount: expense.count,
        monthly,
        categoryBreakdown,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getTopCategories = async (req, res) => {
  try {
    const { months = 3 } = req.query;
    const since = new Date();
    since.setMonth(since.getMonth() - parseInt(months));

    const categories = await Transaction.aggregate([
      { $match: { user: req.user._id, date: { $gte: since }, type: 'expense' } },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 }, avg: { $avg: '$amount' } } },
      { $sort: { total: -1 } },
      { $limit: 10 },
    ]);

    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
