/**
 * Bookmarks (saved articles) — backend-synced.
 * Tüm endpoint'ler auth gerektirir.
 */
import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { query } from '../db';

const router = Router();
router.use(authMiddleware);

/**
 * GET /api/bookmarks
 * Response:
 *   {
 *     ids: string[],            // sadece id listesi (UI'da hızlı "saved mı?" kontrolü için)
 *     articles: Article[]       // recent N kayıtlı makale, en yeniden eskiye
 *   }
 * Query: ?limit=N (default 50, max 200)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'auth required' });
    const limit = Math.min(Math.max(Number(req.query.limit ?? 50), 1), 200);

    // Tüm id'ler — hızlı set kontrolü için
    const idsRes = await query<{ article_id: string }>(
      `SELECT article_id FROM saved_articles WHERE user_id = $1 ORDER BY saved_at DESC`,
      [req.user.userId],
    );
    const ids = idsRes.rows.map((r) => r.article_id);

    // Detaylı top-N
    const articlesRes = await query<any>(
      `SELECT a.id, a.title, a.description, a.url, a.image_url, a.published_at,
              a.category, a.language, a.source_name, a.source_url,
              s.saved_at
         FROM saved_articles s
         JOIN articles a ON a.id = s.article_id
        WHERE s.user_id = $1
        ORDER BY s.saved_at DESC
        LIMIT $2`,
      [req.user.userId, limit],
    );

    return res.json({ ids, articles: articlesRes.rows });
  } catch (err) {
    console.error('[Bookmarks] list error:', err);
    return res.status(500).json({ error: 'Bookmarks alınamadı' });
  }
});

/** POST /api/bookmarks/:id — kaydet (idempotent) */
router.post('/:id', async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'auth required' });
    const articleId = req.params.id;

    // Makale gerçekten var mı kontrol et — FK assert
    const check = await query<{ id: string }>(`SELECT id FROM articles WHERE id = $1`, [articleId]);
    if (check.rowCount === 0) {
      return res.status(404).json({ error: 'Makale bulunamadı' });
    }

    await query(
      `INSERT INTO saved_articles (user_id, article_id) VALUES ($1, $2)
       ON CONFLICT (user_id, article_id) DO NOTHING`,
      [req.user.userId, articleId],
    );
    return res.json({ ok: true });
  } catch (err) {
    console.error('[Bookmarks] save error:', err);
    return res.status(500).json({ error: 'Bookmark eklenemedi' });
  }
});

/** DELETE /api/bookmarks/:id — kaldır (idempotent) */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'auth required' });
    await query(
      `DELETE FROM saved_articles WHERE user_id = $1 AND article_id = $2`,
      [req.user.userId, req.params.id],
    );
    return res.json({ ok: true });
  } catch (err) {
    console.error('[Bookmarks] delete error:', err);
    return res.status(500).json({ error: 'Bookmark silinemedi' });
  }
});

export default router;
