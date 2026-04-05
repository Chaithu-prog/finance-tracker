const ChatMessage = require('../models/ChatMessage');

exports.getMessages = async (req, res) => {
  try {
    const { room = 'general', page = 1, limit = 30 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const messages = await ChatMessage.find({ room, isDeleted: false })
      .populate('user', 'name avatar email')
      .populate('replyTo', 'message user')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    res.json({ success: true, data: messages.reverse() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.postMessage = async (req, res) => {
  try {
    const { message, room = 'general', replyTo } = req.body;
    const msg = await ChatMessage.create({ user: req.user._id, message, room, replyTo: replyTo || null });
    await msg.populate('user', 'name avatar email');
    res.status(201).json({ success: true, data: msg });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.likeMessage = async (req, res) => {
  try {
    const msg = await ChatMessage.findById(req.params.id);
    if (!msg) return res.status(404).json({ success: false, message: 'Message not found.' });
    const idx = msg.likes.indexOf(req.user._id);
    if (idx > -1) { msg.likes.splice(idx, 1); } else { msg.likes.push(req.user._id); }
    await msg.save();
    res.json({ success: true, data: { likes: msg.likes.length, liked: idx === -1 } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteMessage = async (req, res) => {
  try {
    const msg = await ChatMessage.findOne({ _id: req.params.id, user: req.user._id });
    if (!msg) return res.status(404).json({ success: false, message: 'Message not found.' });
    msg.isDeleted = true;
    await msg.save();
    res.json({ success: true, message: 'Message deleted.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
