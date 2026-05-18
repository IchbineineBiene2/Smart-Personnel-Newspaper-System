import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { query as dbQuery } from '../db/index';

const router = Router();
router.use(authMiddleware);

/**
 * GET /api/contacts/search
 * Search for users
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { q, limit = 20 } = req.query;

    if (!q || q.toString().length < 2) {
      res.status(400).json({ error: 'Search query too short' });
      return;
    }

    const result = await dbQuery(
      `SELECT id, username, full_name, email FROM users
       WHERE (username ILIKE $1 OR full_name ILIKE $1 OR email ILIKE $1)
       AND id != $2
       AND status = 'active'
       AND role = 'user'
       LIMIT $3`,
      [`%${q}%`, req.user?.userId, limit]
    );

    res.json({ users: result.rows });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/contacts/profile/:userId
 * Get user profile
 */
router.get('/profile/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const result = await dbQuery(
      `SELECT id, username, full_name, email, created_at, role FROM users
       WHERE id = $1 AND status = 'active'`,
      [userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = result.rows[0];

    // Get user's recent articles
    const articlesResult = await dbQuery(
      `SELECT id, title, description FROM articles 
       WHERE source_name = $1
       ORDER BY published_at DESC
       LIMIT 5`,
      [user.username]
    );

    // Get friend count
    const friendCountResult = await dbQuery(
      `SELECT COUNT(*) as count FROM friend_requests
       WHERE ((requester_id = $1 OR recipient_id = $1) AND status = 'accepted')`,
      [userId]
    );

    // Get friend status if current user is authenticated
    let friend_status = 'none'; // 'none', 'friends', 'pending', 'sent'
    let friend_request_id = null;

    if (req.user && req.user.userId !== parseInt(userId)) {
      const statusResult = await dbQuery(
        `SELECT id, requester_id, status FROM friend_requests
         WHERE (requester_id = $1 AND recipient_id = $2)
            OR (requester_id = $2 AND recipient_id = $1)`,
        [req.user.userId, userId]
      );

      if (statusResult.rows.length > 0) {
        const request = statusResult.rows[0];
        friend_request_id = request.id;
        if (request.status === 'accepted') {
          friend_status = 'friends';
        } else if (request.status === 'pending') {
          friend_status = request.requester_id === req.user.userId ? 'sent' : 'pending';
        }
      }
    }

    res.json({ 
      user, 
      recent_articles: articlesResult.rows,
      friend_count: parseInt(friendCountResult.rows[0].count),
      friend_status,
      friend_request_id
    });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/contacts/block/:userId
 * Block user
 */
router.post('/block/:userId', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { userId } = req.params;

    if (req.user.userId === parseInt(userId)) {
      res.status(400).json({ error: 'Cannot block yourself' });
      return;
    }

    // Check if already blocked
    const checkBlock = await dbQuery(
      `SELECT id FROM blocked_users 
       WHERE user_id = $1 AND blocked_user_id = $2`,
      [req.user.userId, userId]
    );

    if (checkBlock.rows.length > 0) {
      res.status(400).json({ error: 'User already blocked' });
      return;
    }

    const result = await dbQuery(
      `INSERT INTO blocked_users (user_id, blocked_user_id)
       VALUES ($1, $2)
       RETURNING *`,
      [req.user.userId, userId]
    );

    res.status(201).json({ blocked_user: result.rows[0] });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/contacts/unblock/:userId
 * Unblock user
 */
router.post('/unblock/:userId', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { userId } = req.params;

    const result = await dbQuery(
      `DELETE FROM blocked_users 
       WHERE user_id = $1 AND blocked_user_id = $2
       RETURNING id`,
      [req.user.userId, userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not blocked' });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/contacts/blocked
 * Get blocked users list
 */
router.get('/blocked', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const result = await dbQuery(
      `SELECT u.id, u.username, u.email, bu.created_at as blocked_at
       FROM blocked_users bu
       JOIN users u ON bu.blocked_user_id = u.id
       WHERE bu.user_id = $1
       ORDER BY bu.created_at DESC`,
      [req.user.userId]
    );

    res.json({ blocked_users: result.rows });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

export default router;
