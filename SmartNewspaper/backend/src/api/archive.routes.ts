import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { query as dbQuery } from '../db/index';

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
      `SELECT * FROM archive_editions WHERE user_id = $1 ORDER BY edition_date DESC`,
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

    const { title, description, selectedArticles } = req.body;

    if (!selectedArticles || !Array.isArray(selectedArticles)) {
      res.status(400).json({ error: 'selectedArticles array required' });
      return;
    }

    const result = await dbQuery(
      `INSERT INTO archive_editions (user_id, edition_date, edition_type, title, description, selected_articles, created_at)
       VALUES ($1, NOW()::DATE, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [req.user.userId, 'daily', title || 'Personalized Edition', description || null, selectedArticles]
    );

    res.status(201).json({ edition: result.rows[0] });
  } catch (err) {
    const error = err as Error;
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
