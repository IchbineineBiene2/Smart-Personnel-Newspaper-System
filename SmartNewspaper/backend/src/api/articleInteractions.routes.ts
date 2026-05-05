import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { verifyToken } from '../models/authModel';
import { query as dbQuery } from '../db/index';

const router = Router();

function getOptionalUserId(req: Request): number | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

  const user = verifyToken(authHeader.slice(7));
  return user?.userId ?? null;
}

async function articleExists(articleId: string): Promise<boolean> {
  const result = await dbQuery('SELECT id FROM articles WHERE id = $1', [articleId]);
  return result.rows.length > 0;
}

router.get('/:articleId', async (req: Request, res: Response) => {
  try {
    const { articleId } = req.params;
    const userId = getOptionalUserId(req);

    if (!(await articleExists(articleId))) {
      res.status(404).json({ error: 'Article not found' });
      return;
    }

    const [likesResult, commentsResult, likedResult] = await Promise.all([
      dbQuery('SELECT COUNT(*)::int AS count FROM article_likes WHERE article_id = $1', [articleId]),
      dbQuery('SELECT COUNT(*)::int AS count FROM article_comments WHERE article_id = $1', [articleId]),
      userId
        ? dbQuery('SELECT id FROM article_likes WHERE article_id = $1 AND user_id = $2', [articleId, userId])
        : Promise.resolve({ rows: [] } as any),
    ]);

    res.json({
      likes_count: likesResult.rows[0]?.count ?? 0,
      comments_count: commentsResult.rows[0]?.count ?? 0,
      liked_by_me: likedResult.rows.length > 0,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/:articleId/comments', async (req: Request, res: Response) => {
  try {
    const { articleId } = req.params;

    if (!(await articleExists(articleId))) {
      res.status(404).json({ error: 'Article not found' });
      return;
    }

    const result = await dbQuery(
      `SELECT
         c.id,
         c.article_id,
         c.user_id,
         c.parent_id,
         c.content,
         c.created_at,
         c.updated_at,
         u.username,
         u.email
       FROM article_comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.article_id = $1
       ORDER BY c.created_at ASC, c.id ASC`,
      [articleId]
    );

    res.json({ comments: result.rows });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/:articleId/like', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { articleId } = req.params;
    if (!(await articleExists(articleId))) {
      res.status(404).json({ error: 'Article not found' });
      return;
    }

    const existing = await dbQuery(
      'SELECT id FROM article_likes WHERE article_id = $1 AND user_id = $2',
      [articleId, req.user.userId]
    );

    let liked = false;
    if (existing.rows.length > 0) {
      await dbQuery('DELETE FROM article_likes WHERE article_id = $1 AND user_id = $2', [
        articleId,
        req.user.userId,
      ]);
    } else {
      await dbQuery('INSERT INTO article_likes (article_id, user_id) VALUES ($1, $2)', [
        articleId,
        req.user.userId,
      ]);
      liked = true;
    }

    const countResult = await dbQuery(
      'SELECT COUNT(*)::int AS count FROM article_likes WHERE article_id = $1',
      [articleId]
    );

    res.json({ liked, likes_count: countResult.rows[0]?.count ?? 0 });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/:articleId/comments', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { articleId } = req.params;
    const { content, parent_id } = req.body;
    const trimmed = typeof content === 'string' ? content.trim() : '';

    if (!trimmed) {
      res.status(400).json({ error: 'Comment content required' });
      return;
    }

    if (!(await articleExists(articleId))) {
      res.status(404).json({ error: 'Article not found' });
      return;
    }

    let parentCommentOwnerId: number | null = null;
    if (parent_id) {
      const parentCheck = await dbQuery(
        'SELECT id, user_id FROM article_comments WHERE id = $1 AND article_id = $2',
        [parent_id, articleId]
      );

      if (parentCheck.rows.length === 0) {
        res.status(400).json({ error: 'Parent comment not found' });
        return;
      }

      parentCommentOwnerId = parentCheck.rows[0].user_id;
    }

    const result = await dbQuery(
      `INSERT INTO article_comments (article_id, user_id, parent_id, content)
       VALUES ($1, $2, $3, $4)
       RETURNING id, article_id, user_id, parent_id, content, created_at, updated_at`,
      [articleId, req.user.userId, parent_id || null, trimmed]
    );

    if (parentCommentOwnerId && parentCommentOwnerId !== req.user.userId) {
      await dbQuery(
        `INSERT INTO notifications (user_id, type, title, content, related_user_id, related_article_id)
         VALUES ($1, 'comment_reply', $2, $3, $4, $5)`,
        [
          parentCommentOwnerId,
          `${req.user.username} yorumuna yanıt verdi`,
          trimmed.substring(0, 160),
          req.user.userId,
          articleId,
        ]
      );
    }

    res.status(201).json({
      comment: {
        ...result.rows[0],
        username: req.user.username,
        email: req.user.email,
      },
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
