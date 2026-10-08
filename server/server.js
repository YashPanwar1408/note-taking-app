import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import notesRoutes from './Routes/routes.js';
import { authRoutes } from './auth.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '20kb' }));

const authRouter = express.Router();
app.get('/', (req, res) => res.json({ message: 'Notes API is running.' }));
app.use('/auth', authRoutes(authRouter));
app.use('/notes', notesRoutes);
app.use((req, res) => res.status(404).json({ message: 'Route not found.' }));
app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400) return res.status(400).json({ message: 'Request body must be valid JSON.' });
  if (error.status === 413) return res.status(413).json({ message: 'Request body is too large.' });
  return res.status(500).json({ message: 'An unexpected server error occurred.' });
});

const start = async () => {
  const mongoUrl = process.env.MONGODB_URI || process.env.mongoDBURL;
  if (!mongoUrl) throw new Error('Set MONGODB_URI in server/.env before starting the server.');
  await mongoose.connect(mongoUrl);
  const port = process.env.PORT || 5000;
  app.listen(port, () => console.log(`Server listening on port ${port}`));
};

start().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
