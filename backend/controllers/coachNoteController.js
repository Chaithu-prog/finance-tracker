const CoachNote = require('../models/CoachNote');

exports.getNotes = async (req, res) => {
  try {
    const notes = await CoachNote.find({ coach: req.coach._id, user: req.params.userId }).sort({ createdAt: -1 });
    res.json({ success: true, data: notes });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createNote = async (req, res) => {
  try {
    const note = await CoachNote.create({
      coach: req.coach._id,
      user: req.params.userId,
      content: req.body.content,
      category: req.body.category
    });
    res.status(201).json({ success: true, data: note });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateNote = async (req, res) => {
  try {
    const note = await CoachNote.findOneAndUpdate(
      { _id: req.params.id, coach: req.coach._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }
    res.json({ success: true, data: note });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteNote = async (req, res) => {
  try {
    const note = await CoachNote.findOneAndDelete({ _id: req.params.id, coach: req.coach._id });
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }
    res.json({ success: true, message: 'Note deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};