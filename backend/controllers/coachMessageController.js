const CoachMessage = require('../models/CoachMessage');
const Coach = require('../models/Coach');

exports.getConversation = async (req, res) => {
  try {
    let query, markReadQuery;
    if (req.coach) {
      query = { coach: req.coach._id, user: req.params.userId };
      markReadQuery = { coach: req.coach._id, user: req.params.userId, sender: 'user', isRead: false };
    } else if (req.user) {
      query = { coach: req.params.coachId, user: req.user._id };
      markReadQuery = { coach: req.params.coachId, user: req.user._id, sender: 'coach', isRead: false };
    } else {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    await CoachMessage.updateMany(markReadQuery, { isRead: true });
    const messages = await CoachMessage.find(query).sort({ createdAt: 1 }).limit(100);
    res.json({ success: true, data: messages });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { userId, message, messageType } = req.body;
    let coachId, sender;
    if (req.coach) {
      coachId = req.coach._id;
      sender = 'coach';
    } else if (req.user) {
      coachId = req.params.coachId;
      sender = 'user';
    } else {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const msg = await CoachMessage.create({
      coach: coachId,
      user: userId,
      sender,
      message,
      messageType: messageType || 'text'
    });
    res.status(201).json({ success: true, data: msg });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getCoachInbox = async (req, res) => {
  try {
    const coach = await Coach.findById(req.coach._id).populate('assignedUsers', 'name email avatar');
    const inbox = await Promise.all(coach.assignedUsers.map(async (user) => {
      const lastMessage = await CoachMessage.findOne({ coach: req.coach._id, user: user._id }).sort({ createdAt: -1 });
      const unreadCount = await CoachMessage.countDocuments({ coach: req.coach._id, user: user._id, sender: 'user', isRead: false });
      return {
        userId: user._id,
        userName: user.name,
        userEmail: user.email,
        userAvatar: user.avatar,
        lastMessage: lastMessage ? lastMessage.message : null,
        lastMessageTime: lastMessage ? lastMessage.createdAt : null,
        unreadCount
      };
    }));
    inbox.sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));
    res.json({ success: true, data: inbox });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    let count;
    if (req.coach) {
      count = await CoachMessage.countDocuments({ coach: req.coach._id, sender: 'user', isRead: false });
    } else if (req.user) {
      count = await CoachMessage.countDocuments({ user: req.user._id, sender: 'coach', isRead: false });
    } else {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    res.json({ success: true, data: { count } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};