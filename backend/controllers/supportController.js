const Support = require('../models/Support');

exports.getTickets = async (req, res) => {
  try {
    const tickets = await Support.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, data: tickets });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createTicket = async (req, res) => {
  try {
    const { subject, category, priority, message } = req.body;
    const ticket = await Support.create({
      user: req.user._id,
      subject,
      category,
      priority,
      messages: [{ sender: 'user', content: message }],
    });
    res.status(201).json({ success: true, message: 'Support ticket created. We will respond within 24 hours.', data: ticket });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.replyToTicket = async (req, res) => {
  try {
    const ticket = await Support.findOne({ _id: req.params.id, user: req.user._id });
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found.' });
    ticket.messages.push({ sender: 'user', content: req.body.message });
    if (ticket.status === 'resolved' || ticket.status === 'closed') ticket.status = 'open';
    await ticket.save();
    res.json({ success: true, message: 'Reply sent.', data: ticket });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getTicketById = async (req, res) => {
  try {
    const ticket = await Support.findOne({ _id: req.params.id, user: req.user._id });
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found.' });
    res.json({ success: true, data: ticket });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
