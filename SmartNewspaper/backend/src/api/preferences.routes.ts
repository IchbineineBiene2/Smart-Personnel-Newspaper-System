import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { query as dbQuery } from '../db/index';

const router = Router();
router.use(authMiddleware);

/**
 * GET /api/preferences
 * Returns the current user's preferences (creates a default row on first access).
 *
 * Response shape:
 *   {
 *     preferredCategories: string[],
 *     preferredLanguages:  string[],
 *     preferredSources:    string[],
 *     mutedSources:        string[],
 *     language:            string,    // legacy single value, hâlâ destekleniyor
 *     theme:               string,
 *     notificationsEnabled: boolean,
 *     emailDigest:          boolean,
 *     digestFrequency:      string,
 *   }
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    let row = await dbQuery(
      `SELECT preferred_categories, preferred_languages, preferred_sources, muted_sources, custom_tags,
              language, theme, notifications_enabled, email_digest, digest_frequency
       FROM user_preferences WHERE user_id = $1`,
      [req.user.userId],
    );

    if (row.rows.length === 0) {
      row = await dbQuery(
        `INSERT INTO user_preferences (user_id) VALUES ($1)
         RETURNING preferred_categories, preferred_languages, preferred_sources, muted_sources, custom_tags,
                   language, theme, notifications_enabled, email_digest, digest_frequency`,
        [req.user.userId],
      );
    }

    const p = row.rows[0] as any;
    res.json({
      preferredCategories: p.preferred_categories ?? [],
      preferredLanguages: p.preferred_languages ?? [],
      preferredSources: p.preferred_sources ?? [],
      mutedSources: p.muted_sources ?? [],
      customTags: p.custom_tags ?? [],
      language: p.language,
      theme: p.theme,
      notificationsEnabled: p.notifications_enabled,
      emailDigest: p.email_digest,
      digestFrequency: p.digest_frequency,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * PUT /api/preferences
 * Partial update. Yalnızca gönderilen alanlar değişir (COALESCE).
 * Accepted body fields (any subset):
 *   preferredCategories, preferredLanguages, preferredSources, mutedSources,
 *   language, theme, notificationsEnabled, emailDigest, digestFrequency
 */
router.put('/', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    // Ensure row exists
    await dbQuery(
      `INSERT INTO user_preferences (user_id) VALUES ($1)
       ON CONFLICT (user_id) DO NOTHING`,
      [req.user.userId],
    );

    const b = req.body ?? {};
    const result = await dbQuery(
      `UPDATE user_preferences
         SET preferred_categories  = COALESCE($1, preferred_categories),
             preferred_languages   = COALESCE($2, preferred_languages),
             preferred_sources     = COALESCE($3, preferred_sources),
             muted_sources         = COALESCE($4, muted_sources),
             language              = COALESCE($5, language),
             theme                 = COALESCE($6, theme),
             notifications_enabled = COALESCE($7, notifications_enabled),
             email_digest          = COALESCE($8, email_digest),
             digest_frequency      = COALESCE($9, digest_frequency),
             custom_tags           = COALESCE($10, custom_tags),
             updated_at            = NOW()
       WHERE user_id = $11
       RETURNING preferred_categories, preferred_languages, preferred_sources, muted_sources, custom_tags,
                 language, theme, notifications_enabled, email_digest, digest_frequency`,
      [
        Array.isArray(b.preferredCategories) ? b.preferredCategories : null,
        Array.isArray(b.preferredLanguages) ? b.preferredLanguages : null,
        Array.isArray(b.preferredSources) ? b.preferredSources : null,
        Array.isArray(b.mutedSources) ? b.mutedSources : null,
        typeof b.language === 'string' ? b.language : null,
        typeof b.theme === 'string' ? b.theme : null,
        typeof b.notificationsEnabled === 'boolean' ? b.notificationsEnabled : null,
        typeof b.emailDigest === 'boolean' ? b.emailDigest : null,
        typeof b.digestFrequency === 'string' ? b.digestFrequency : null,
        Array.isArray(b.customTags) ? b.customTags : null,
        req.user.userId,
      ],
    );

    const p = result.rows[0] as any;
    res.json({
      preferredCategories: p.preferred_categories ?? [],
      preferredLanguages: p.preferred_languages ?? [],
      preferredSources: p.preferred_sources ?? [],
      mutedSources: p.muted_sources ?? [],
      customTags: p.custom_tags ?? [],
      language: p.language,
      theme: p.theme,
      notificationsEnabled: p.notifications_enabled,
      emailDigest: p.email_digest,
      digestFrequency: p.digest_frequency,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
