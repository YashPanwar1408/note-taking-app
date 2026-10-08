import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  passwordSalt: { type: String, required: true }
}, { timestamps: true });

const noteSchema = new mongoose.Schema({
  topic: { type: String, required: true, trim: true, maxlength: 120 },
  status: { type: String, required: true, trim: true, maxlength: 40 },
  notes: { type: String, required: true, trim: true, maxlength: 5000 },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true }
}, { timestamps: true });

export const User = mongoose.model('User', userSchema);
export const Notes = mongoose.model('Note', noteSchema);
