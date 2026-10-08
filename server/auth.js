import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { User } from './Modal/model.js';

const scrypt = promisify(crypto.scrypt);
const secret = process.env.JWT_SECRET || 'local-development-secret-change-me';

const createToken = (user) => {
  const payload = Buffer.from(JSON.stringify({ id: user._id.toString(), exp: Date.now() + 7 * 24 * 60 * 60 * 1000 })).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
};

export const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) return res.status(401).json({ message: 'Please log in to continue.' });

    const [payload, signature] = token.split('.');
    if (!payload || !signature) return res.status(401).json({ message: 'Invalid login session.' });
    const expected = crypto.createHmac('sha256', secret).update(payload).digest();
    const provided = Buffer.from(signature, 'base64url');
    if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
      return res.status(401).json({ message: 'Invalid login session.' });
    }

    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (data.exp < Date.now()) return res.status(401).json({ message: 'Your session has expired. Please log in again.' });
    req.user = await User.findById(data.id).select('_id name email');
    if (!req.user) return res.status(401).json({ message: 'User account was not found.' });
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid login session.' });
  }
};

export const authRoutes = (router) => {
  router.post('/signup', async (req, res) => {
    try {
      const body = req.body || {};
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      const password = typeof body.password === 'string' ? body.password : '';
      if (!name || !/^\S+@\S+\.\S+$/.test(email) || password.length < 8) {
        return res.status(400).json({ message: 'Enter your name, a valid email, and a password with at least 8 characters.' });
      }
      if (await User.exists({ email })) return res.status(409).json({ message: 'An account with this email already exists.' });
      const passwordSalt = crypto.randomBytes(16).toString('hex');
      const passwordHash = (await scrypt(password, passwordSalt, 64)).toString('hex');
      const user = await User.create({ name, email, passwordSalt, passwordHash });
      return res.status(201).json({ token: createToken(user), user: { id: user._id, name: user.name, email: user.email } });
    } catch (error) {
      if (error.code === 11000) return res.status(409).json({ message: 'An account with this email already exists.' });
      return res.status(500).json({ message: 'Could not create your account.' });
    }
  });

  router.post('/login', async (req, res) => {
    try {
      const body = req.body || {};
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      const password = typeof body.password === 'string' ? body.password : '';
      if (!email || !password) return res.status(400).json({ message: 'Enter your email and password.' });
      const user = await User.findOne({ email });
      if (!user) return res.status(401).json({ message: 'Email or password is incorrect.' });
      const passwordHash = (await scrypt(password, user.passwordSalt, 64)).toString('hex');
      if (passwordHash !== user.passwordHash) return res.status(401).json({ message: 'Email or password is incorrect.' });
      return res.json({ token: createToken(user), user: { id: user._id, name: user.name, email: user.email } });
    } catch {
      return res.status(500).json({ message: 'Could not log in right now.' });
    }
  });

  router.get('/me', authenticate, (req, res) => res.json({ user: req.user }));
  return router;
};
