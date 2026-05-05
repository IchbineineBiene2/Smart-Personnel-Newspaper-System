import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { query as dbQuery } from '../db/index';

const router = Router();
router.use(authMiddleware);

/**
 * GET /api/preferences
 * Get current user's preferences
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const result = await dbQuery(
      'SELECT * FROM user_preferences WHERE user_id = $1',
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      const defaultResult = await dbQuery(
        `INSERT INTO user_preferences (user_id, preferred_categories, language, theme)
         VALUES ($1, '{}', 'tr', 'light')
         RETURNING *`,
        [req.user.userId]
      );
      res.json({ preferences: defaultResult.rows[0] });
    } else {
      res.json({ preferences: result.rows[0] });
    }
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/preferences
 * Update user preferences
 */
router.put('/', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const {
      preferred_categories,
      language,
      theme,
      notifications_enabled,
      email_digest,
      digest_frequency,
    } = req.body;

    const result = await dbQuery(
      `UPDATE user_preferences 
       SET preferred_categories = COALESCE($1, preferred_categories),
           language = COALESCE($2, language),
           theme = COALESCE($3, theme),
           notifications_enabled = COALESCE($4, notifications_enabled),
           email_digest = COALESCE($5, email_digest),
           digest_frequency = COALESCE($6, digest_frequency),
           updated_at = NOW()
       WHERE user_id = $7
       RETURNING *`,
      [
        preferred_categories || null,
        language || null,
        theme || null,
        notifications_enabled !== undefined ? notifications_enabled : null,
        email_digest !== undefined ? email_digest : null,
        digest_frequency || null,
        req.user.userId,
      ]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Preferences not found' });
      return;
    }

    res.json({ preferences: result.rows[0] });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

export default router;
