import { Router, Request, Response } from 'express';
import * as authModel from '../models/authModel';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

/**
 * POST /api/auth/register
 * Register new user
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
    const fullName = typeof req.body.fullName === 'string' ? req.body.fullName.trim() : '';
    const email = typeof req.body.email === 'string' ? req.body.email.trim() : '';
    const { password } = req.body;

    if (!email || !password || !username || !fullName) {
      res.status(400).json({ error: 'Full name, username, email and password required' });
      return;
    }

    if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) {
      res.status(400).json({ error: 'Username must be 3-24 characters and use only letters, numbers or underscore' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters' });
      return;
    }

    const user = await authModel.registerUser(username, fullName, email, password);
    const token = authModel.generateToken(user);

    res.status(201).json({ user, token });
  } catch (err) {
    const error = err as Error & { code?: string; constraint?: string };
    if (error.code === '23505') {
      const field = error.constraint?.includes('email') ? 'E-posta' : 'Kullanici adi';
      res.status(409).json({ error: `${field} zaten kullaniliyor` });
      return;
    }
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/auth/login
 * Login user
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const { password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password required' });
      return;
    }

    const user = await authModel.loginUser(email, password);
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = authModel.generateToken(user);
    res.json({ user, token });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/auth/me
 * Get current user info (requires auth)
 */
router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    res.json({ user: req.user });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

export default router;
