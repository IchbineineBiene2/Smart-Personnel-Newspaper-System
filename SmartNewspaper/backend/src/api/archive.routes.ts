import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { query as dbQuery, withTransaction } from '../db/index';

const router = Router();
router.use(authMiddleware);

/**
 * GET /api/archive/:userId
 * Get all archive editions for a user
 */
router.get('/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (req.user?.userId !== parseInt(userId) && req.user?.role !== 'admin') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const result = await dbQuery(
      `SELECT * FROM archive_editions WHERE user_id = $1 ORDER BY created_at DESC, id DESC`,
      [userId]
    );

    res.json({ editions: result.rows });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/archive/generate
 * Generate new archive edition
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const userId = req.user.userId;

    const { title, description, selectedArticles, articlesSnapshot } = req.body;

    if (!selectedArticles || !Array.isArray(selectedArticles)) {
      res.status(400).json({ error: 'selectedArticles array required' });
      return;
    }

    const sortedArticles = selectedArticles
      .map((articleId) => String(articleId).trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));

    if (sortedArticles.length === 0) {
      res.status(400).json({ error: 'Gazete olusturmak icin en az bir makale secmelisiniz.' });
      return;
    }

    // Combine title and description or use title as edition date
    const editionDate = new Date().toISOString().split('T')[0];
    const fullDescription = [title, description].filter(Boolean).join(' - ');
    const articleKey = sortedArticles.join('|');
    const snapshot = Array.isArray(articlesSnapshot) ? articlesSnapshot : [];

    const edition = await withTransaction(async (client) => {
      await client.query(
        'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))',
        [String(userId), articleKey]
      );

      // Check for duplicate - same articles with same user
      const duplicateCheck = await client.query(
        `SELECT id FROM archive_editions
         WHERE user_id = $1 AND selected_articles = $2::text[]`,
        [userId, sortedArticles]
      );

      if (duplicateCheck.rows.length > 0) {
        return null;
      }

      const result = await client.query(
        `INSERT INTO archive_editions (user_id, edition_date, edition_type, title, description, selected_articles, articles_snapshot, created_at)
         VALUES ($1, $2, $3, $4, $5, $6::text[], $7::jsonb, NOW())
         RETURNING *`,
        [
          userId,
          editionDate,
          'daily',
          title || 'Smart Newspaper',
          fullDescription || null,
          sortedArticles,
          JSON.stringify(snapshot),
        ]
      );

      return result.rows[0];
    });

    if (!edition) {
      res.status(400).json({ error: 'Bu makalelerle zaten bir gazete olusturmusunuz.' });
      return;
    }

    res.status(201).json({ edition });
  } catch (err) {
    const error = err as Error;
    if ((err as { code?: string }).code === '23505') {
      res.status(400).json({ error: 'Bu makalelerle zaten bir gazete olusturmusunuz.' });
      return;
    }
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/archive/:userId/:editionId
 * Delete archive edition
 */
router.delete('/:userId/:editionId', async (req: Request, res: Response) => {
  try {
    const { userId, editionId } = req.params;

    if (req.user?.userId !== parseInt(userId) && req.user?.role !== 'admin') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const result = await dbQuery(
      `DELETE FROM archive_editions WHERE id = $1 AND user_id = $2 RETURNING id`,
      [editionId, userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Edition not found' });
      return;
    }

    res.json({ success: true, editionId });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

export default router;
