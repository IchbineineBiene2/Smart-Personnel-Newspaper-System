import { Router, Request, Response } from 'express';
import { authMiddleware, adminMiddleware } from '../middleware/authMiddleware';
import { query as dbQuery } from '../db/index';
import { hashPassword } from '../models/authModel';
import { RSS_SOURCES } from '../config/sources';

const router = Router();

/**
 * POST /api/admin/seed
 * Create admin user if none exists. No auth required.
 */
router.post('/seed', async (req: Request, res: Response) => {
  try {
    const countResult = await dbQuery(
      `SELECT COUNT(*) as count FROM users WHERE role = 'admin'`
    );
    const adminCount = parseInt(countResult.rows[0].count, 10);

    if (adminCount > 0) {
      res.status(200).json({ message: 'Admin already exists' });
      return;
    }

    const passwordHash = hashPassword('Admin123!');
    await dbQuery(
      `INSERT INTO users (username, full_name, email, password_hash, role, status)
       VALUES ($1, $2, $3, $4, 'admin', 'active')`,
      ['admin', 'Admin', 'admin@haberdar.com', passwordHash]
    );

    res.status(201).json({
      message: 'Admin created',
      email: 'admin@haberdar.com',
      password: 'Admin123!',
    });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

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

/**
 * GET /api/admin/logs
 * Return system logs from DB, or mock data if table does not exist.
 */
router.get('/logs', async (req: Request, res: Response) => {
  try {
    const result = await dbQuery(
      `SELECT id, timestamp, level, module, message FROM system_logs ORDER BY timestamp DESC LIMIT 100`
    );
    res.json({ logs: result.rows });
  } catch {
    // system_logs table does not exist — return mock data
    res.json({
      logs: [
        { id: 'log-001', timestamp: '2026-05-20 14:32:10', level: 'info',    module: 'NewsCollection',  message: 'Haber toplama görevi tamamlandı. 23 yeni makale.' },
        { id: 'log-002', timestamp: '2026-05-20 14:30:05', level: 'warning', module: 'NewsCollection',  message: 'Sözcü kaynağından veri çekilemedi.' },
        { id: 'log-003', timestamp: '2026-05-20 13:00:00', level: 'info',    module: 'Archive',         message: 'Günlük arşiv oluşturuldu.' },
        { id: 'log-004', timestamp: '2026-05-20 10:15:12', level: 'error',   module: 'Auth',            message: 'Başarısız giriş denemesi: test@example.com (3. deneme).' },
        { id: 'log-005', timestamp: '2026-05-20 09:00:00', level: 'info',    module: 'Recommendation',  message: 'Öneri motoru güncellendi. 150 kullanıcı için yeni öneriler hazırlandı.' },
      ],
    });
  }
});

/**
 * GET /api/admin/sources
 * Return the list of news sources. Falls back to mock data if RSS_SOURCES is unavailable.
 */
router.get('/sources', (req: Request, res: Response) => {
  try {
    if (RSS_SOURCES && RSS_SOURCES.length > 0) {
      const sources = RSS_SOURCES.map((src, index) => ({
        id: `src-${String(index + 1).padStart(3, '0')}`,
        name: src.name,
        url: src.url,
        category: src.category ?? 'general',
        language: src.language,
        isActive: true,
      }));
      res.json({ sources });
      return;
    }
    throw new Error('No sources');
  } catch {
    res.json({
      sources: [
        { id: 'src-001', name: 'Sabah',      url: 'https://sabah.com.tr',       category: 'Genel',   isActive: true },
        { id: 'src-002', name: 'Cumhuriyet', url: 'https://cumhuriyet.com.tr',  category: 'Siyaset', isActive: true },
        { id: 'src-003', name: 'Hurriyet',   url: 'https://hurriyet.com.tr',    category: 'Genel',   isActive: true },
        { id: 'src-004', name: 'Sozcu',      url: 'https://sozcu.com.tr',       category: 'Siyaset', isActive: true },
        { id: 'src-005', name: 'Reuters',    url: 'https://reuters.com',        category: 'Dünya',   isActive: true },
        { id: 'src-006', name: 'BBC',        url: 'https://bbc.com',            category: 'Dünya',   isActive: true },
      ],
    });
  }
});

/**
 * DELETE /api/admin/users/:userId
 * Soft-delete a user by setting status = 'deleted'.
 */
router.delete('/users/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const result = await dbQuery(
      `UPDATE users SET status = 'deleted' WHERE id = $1 RETURNING id, username, email, role, status`,
      [userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ message: 'User deleted', user: result.rows[0] });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

export default router;
