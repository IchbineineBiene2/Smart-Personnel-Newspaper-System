import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { query as dbQuery } from '../db/index';

const router = Router();
router.use(authMiddleware);

/**
 * GET /api/messages/conversations
 * Get all conversations for current user
 */
router.get('/conversations', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const result = await dbQuery(
      `WITH conversation_messages AS (
         SELECT
           m.*,
           CASE
             WHEN m.sender_id = $1 THEN m.recipient_id
             ELSE m.sender_id
           END AS other_user_id,
           ROW_NUMBER() OVER (
             PARTITION BY CASE WHEN m.sender_id = $1 THEN m.recipient_id ELSE m.sender_id END
             ORDER BY m.created_at DESC, m.id DESC
           ) AS row_number
         FROM messages m
         WHERE m.sender_id = $1 OR m.recipient_id = $1
       ),
       unread_counts AS (
         SELECT
           sender_id AS other_user_id,
           COUNT(*)::int AS unread_count
         FROM messages
         WHERE recipient_id = $1 AND is_read = FALSE
         GROUP BY sender_id
       )
       SELECT
         cm.other_user_id,
         u.username,
         u.email,
         cm.sender_id AS last_sender_id,
         cm.content AS last_message,
         cm.created_at AS last_message_at,
         COALESCE(uc.unread_count, 0) AS unread_count
       FROM conversation_messages cm
       JOIN users u ON u.id = cm.other_user_id
       LEFT JOIN unread_counts uc ON uc.other_user_id = cm.other_user_id
       WHERE cm.row_number = 1
       ORDER BY cm.created_at DESC, cm.id DESC`,
      [req.user.userId]
    );

    res.json({ conversations: result.rows });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/messages/:userId
 * Get messages with specific user
 */
router.get('/:userId', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { userId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    // Check if blocked
    const blockedCheck = await dbQuery(
      `SELECT id FROM blocked_users 
       WHERE (user_id = $1 AND blocked_user_id = $2)
          OR (user_id = $2 AND blocked_user_id = $1)`,
      [req.user.userId, userId]
    );

    if (blockedCheck.rows.length > 0) {
      res.status(403).json({ error: 'Cannot access blocked user' });
      return;
    }

    const result = await dbQuery(
      `SELECT * FROM messages
       WHERE (sender_id = $1 AND recipient_id = $2)
          OR (sender_id = $2 AND recipient_id = $1)
       ORDER BY created_at DESC
       LIMIT $3 OFFSET $4`,
      [req.user.userId, userId, limit, offset]
    );

    // Mark messages as read
    await dbQuery(
      `UPDATE messages 
       SET is_read = TRUE,
           updated_at = NOW()
       WHERE recipient_id = $1 AND sender_id = $2 AND is_read = FALSE`,
      [req.user.userId, userId]
    );

    res.json({ messages: result.rows.reverse() });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/messages/send
 * Send message to user
 */
router.post('/send', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { recipient_id, content } = req.body;

    if (!recipient_id || !content) {
      res.status(400).json({ error: 'recipient_id and content required' });
      return;
    }

    if (req.user.userId === parseInt(recipient_id)) {
      res.status(400).json({ error: 'Cannot send message to yourself' });
      return;
    }

    // Check if blocked
    const blockedCheck = await dbQuery(
      `SELECT id FROM blocked_users 
       WHERE (user_id = $1 AND blocked_user_id = $2)
          OR (user_id = $2 AND blocked_user_id = $1)`,
      [req.user.userId, recipient_id]
    );

    if (blockedCheck.rows.length > 0) {
      res.status(403).json({ error: 'Cannot send message to blocked user' });
      return;
    }

    const result = await dbQuery(
      `INSERT INTO messages (sender_id, recipient_id, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [req.user.userId, recipient_id, content]
    );

    res.status(201).json({ message: result.rows[0] });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/messages/:messageId
 * Delete message
 */
router.delete('/:messageId', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { messageId } = req.params;

    // Only sender can delete
    const result = await dbQuery(
      `DELETE FROM messages 
       WHERE id = $1 AND sender_id = $2
       RETURNING id`,
      [messageId, req.user.userId]
    );

    if (result.rows.length === 0) {
      res.status(403).json({ error: 'Cannot delete this message' });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

export default router;
