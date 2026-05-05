import { Router, Request, Response } from 'express';
import { authMiddleware, adminMiddleware } from '../middleware/authMiddleware';
import { query as dbQuery } from '../db/index';

const router = Router();
router.use(authMiddleware, adminMiddleware);

/**
 * GET /api/admin/users
 * List all users with pagination
 */
router.get('/users', async (req: Request, res: Response) => {
  try {
    const { limit = 20, offset = 0 } = req.query;

    const result = await dbQuery(
      `SELECT id, username, email, role, status, created_at FROM users
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json({ users: result.rows });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/admin/users/:userId/role
 * Update user role
 */
router.put('/users/:userId/role', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!role || !['admin', 'editor', 'user'].includes(role)) {
      res.status(400).json({ error: 'Invalid role' });
      return;
    }

    const result = await dbQuery(
      `UPDATE users SET role = $1 WHERE id = $2
       RETURNING *`,
      [role, userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user: result.rows[0] });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/admin/users/:userId/status
 * Update user status
 */
router.put('/users/:userId/status', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;

    if (!status || !['active', 'suspended', 'deleted'].includes(status)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }

    const result = await dbQuery(
      `UPDATE users SET status = $1 WHERE id = $2
       RETURNING *`,
      [status, userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user: result.rows[0] });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/stats
 * Get system statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const userCount = await dbQuery('SELECT COUNT(*) as count FROM users');
    const articleCount = await dbQuery('SELECT COUNT(*) as count FROM articles');
    const topArticles = await dbQuery(
      'SELECT title, source_name FROM articles ORDER BY published_at DESC LIMIT 5'
    );

    res.json({
      stats: {
        user_count: parseInt(userCount.rows[0].count),
        article_count: parseInt(articleCount.rows[0].count),
        top_articles: topArticles.rows,
      },
    });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

export default router;
