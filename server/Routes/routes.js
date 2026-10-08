import express from 'express';
import mongoose from 'mongoose';
import { Notes } from '../Modal/model.js';
import { authenticate } from '../auth.js';

const router = express.Router();
router.use(authenticate);

const validNote = (body) => {
  body ||= {};
  const topic = typeof body.topic === 'string' ? body.topic.trim() : '';
  const status = typeof body.status === 'string' ? body.status.trim() : '';
  const notes = typeof body.notes === 'string' ? body.notes.trim() : '';
  if (!topic || !status || !notes || topic.length > 120 || status.length > 40 || notes.length > 5000) return null;
  return { topic, status, notes };
};

router.get('/', async (req, res) => {
  try {
    const notes = await Notes.find({ userId: req.user._id }).sort({ createdAt: -1 });
    return res.json({ data: notes });
  } catch {
    return res.status(500).json({ message: 'Could not load notes.' });
  }
});

router.post('/', async (req, res) => {
  const values = validNote(req.body);
  if (!values) return res.status(400).json({ message: 'Enter a topic, status, and note. Keep them within the allowed lengths.' });
  try {
    const note = await Notes.create({ ...values, userId: req.user._id });
    return res.status(201).json(note);
  } catch {
    return res.status(500).json({ message: 'Could not create note.' });
  }
});

router.get('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid note id.' });
  try {
    const note = await Notes.findOne({ _id: req.params.id, userId: req.user._id });
    if (!note) return res.status(404).json({ message: 'Note not found.' });
    return res.json(note);
  } catch {
    return res.status(500).json({ message: 'Could not load note.' });
  }
});

router.put('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid note id.' });
  const values = validNote(req.body);
  if (!values) return res.status(400).json({ message: 'Enter a topic, status, and note. Keep them within the allowed lengths.' });
  try {
    const note = await Notes.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, values, { new: true, runValidators: true });
    if (!note) return res.status(404).json({ message: 'Note not found.' });
    return res.json(note);
  } catch {
    return res.status(500).json({ message: 'Could not update note.' });
  }
});

router.delete('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid note id.' });
  try {
    const note = await Notes.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!note) return res.status(404).json({ message: 'Note not found.' });
    return res.json({ message: 'Note deleted.' });
  } catch {
    return res.status(500).json({ message: 'Could not delete note.' });
  }
});

export default router;
