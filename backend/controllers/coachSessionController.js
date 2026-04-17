const CoachSession = require('../models/CoachSession');
const Coach = require('../models/Coach');

exports.getSessions = async (req, res) => {
  try {
    let query = {};
    if (req.coach) {
      query.coach = req.coach._id;
    } else if (req.user) {
      query.user = req.user._id;
    }
    const sessions = await CoachSession.find(query)
      .populate('coach', 'name avatar specialization')
      .populate('user', 'name email avatar')
      .sort({ scheduledAt: -1 });
    res.json({ success: true, data: sessions });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createSession = async (req, res) => {
  try {
    const { userId, scheduledAt, duration, type, notes, meetingLink, agendaItems } = req.body;
    const coach = await Coach.findById(req.coach._id);
    if (!coach.assignedUsers.includes(userId)) {
      return res.status(403).json({ message: 'User not assigned to this coach' });
    }
    const session = await CoachSession.create({
      coach: req.coach._id,
      user: userId,
      scheduledAt,
      duration,
      type,
      notes,
      meetingLink,
      agendaItems
    });
    res.status(201).json({ success: true, data: session });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateSession = async (req, res) => {
  try {
    const session = await CoachSession.findOneAndUpdate(
      { _id: req.params.id, coach: req.coach._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    res.json({ success: true, data: session });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteSession = async (req, res) => {
  try {
    const session = await CoachSession.findOneAndDelete({ _id: req.params.id, coach: req.coach._id });
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    res.json({ success: true, message: 'Session deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getUserSessions = async (req, res) => {
  try {
    const sessions = await CoachSession.find({ user: req.user._id, scheduledAt: { $gte: new Date() } })
      .populate('coach', 'name avatar specialization')
      .sort({ scheduledAt: 1 });
    res.json({ success: true, data: sessions });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};