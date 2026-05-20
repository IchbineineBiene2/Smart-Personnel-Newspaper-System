import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { query as dbQuery } from '../db/index';

const router = Router();
router.use(authMiddleware);

/**
 * POST /api/friends/request/:userId
 * Send friend request to user
 */
router.post('/request/:userId', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { userId } = req.params;
    const recipientId = parseInt(userId);

    if (req.user.userId === recipientId) {
      res.status(400).json({ error: 'Cannot send friend request to yourself' });
      return;
    }

    // Check if user exists
    const userCheck = await dbQuery(
      `SELECT id, role FROM users WHERE id = $1 AND status = 'active'`,
      [recipientId]
    );

    if (userCheck.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (userCheck.rows[0].role !== 'user') {
      res.status(400).json({ error: 'News publishers can only be followed' });
      return;
    }

    // Check if blocked
    const blockedCheck = await dbQuery(
      `SELECT id FROM blocked_users 
       WHERE (user_id = $1 AND blocked_user_id = $2)
          OR (user_id = $2 AND blocked_user_id = $1)`,
      [req.user.userId, recipientId]
    );

    if (blockedCheck.rows.length > 0) {
      res.status(403).json({ error: 'Cannot send request to blocked user' });
      return;
    }

    // Check if already friends or have pending request
    const existingRequest = await dbQuery(
      `SELECT id, status FROM friend_requests 
       WHERE (requester_id = $1 AND recipient_id = $2)
          OR (requester_id = $2 AND recipient_id = $1)`,
      [req.user.userId, recipientId]
    );

    if (existingRequest.rows.length > 0) {
      const existing = existingRequest.rows[0];
      if (existing.status === 'accepted') {
        res.status(400).json({ error: 'Already friends' });
      } else if (existing.status === 'pending') {
        res.status(400).json({ error: 'Friend request already pending' });
      } else {
        res.status(400).json({ error: 'Friend request already exists' });
      }
      return;
    }

    // Create friend request
    const result = await dbQuery(
      `INSERT INTO friend_requests (requester_id, recipient_id, status)
       VALUES ($1, $2, 'pending')
       RETURNING *`,
      [req.user.userId, recipientId]
    );

    // Create notification
    const requesterInfo = await dbQuery(
      `SELECT username FROM users WHERE id = $1`,
      [req.user.userId]
    );

    await dbQuery(
      `INSERT INTO notifications (user_id, type, title, content, related_user_id)
       VALUES ($1, 'friend_request', $2, $3, $4)`,
      [
        recipientId,
        `${requesterInfo.rows[0].username} sana arkadaş isteği gönderdi`,
        `Arkadaş isteğini kabul et veya reddet`,
        req.user.userId
      ]
    );

    res.status(201).json({ 
      friend_request: result.rows[0],
      message: 'Friend request sent' 
    });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/friends/accept/:requestId
 * Accept friend request
 */
router.post('/accept/:requestId', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { requestId } = req.params;

    const request = await dbQuery(
      `SELECT * FROM friend_requests WHERE id = $1`,
      [requestId]
    );

    if (request.rows.length === 0) {
      res.status(404).json({ error: 'Friend request not found' });
      return;
    }

    const friendRequest = request.rows[0];

    if (friendRequest.recipient_id !== req.user.userId) {
      res.status(403).json({ error: 'Not authorized to accept this request' });
      return;
    }

    if (friendRequest.status !== 'pending') {
      res.status(400).json({ error: `Cannot accept ${friendRequest.status} request` });
      return;
    }

    // Update friend request status
    const result = await dbQuery(
      `UPDATE friend_requests 
       SET status = 'accepted', updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [requestId]
    );

    // Create notification for requester
    const recipientInfo = await dbQuery(
      `SELECT username FROM users WHERE id = $1`,
      [req.user.userId]
    );

    await dbQuery(
      `INSERT INTO notifications (user_id, type, title, content, related_user_id)
       VALUES ($1, 'friend_request', $2, $3, $4)`,
      [
        friendRequest.requester_id,
        `${recipientInfo.rows[0].username} arkadaş isteğini kabul etti`,
        `Artık ${recipientInfo.rows[0].username} ile arkadaşsın`,
        req.user.userId
      ]
    );

    res.json({ 
      friend_request: result.rows[0],
      message: 'Friend request accepted' 
    });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/friends/reject/:requestId
 * Reject friend request
 */
router.post('/reject/:requestId', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { requestId } = req.params;

    const request = await dbQuery(
      `SELECT * FROM friend_requests WHERE id = $1`,
      [requestId]
    );

    if (request.rows.length === 0) {
      res.status(404).json({ error: 'Friend request not found' });
      return;
    }

    const friendRequest = request.rows[0];

    if (friendRequest.recipient_id !== req.user.userId) {
      res.status(403).json({ error: 'Not authorized to reject this request' });
      return;
    }

    // Update friend request status
    const result = await dbQuery(
      `UPDATE friend_requests 
       SET status = 'rejected', updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [requestId]
    );

    res.json({ 
      friend_request: result.rows[0],
      message: 'Friend request rejected' 
    });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/friends
 * Get user's friends and friend requests
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    // Get friends
    const friendsResult = await dbQuery(
      `SELECT 
         CASE 
           WHEN requester_id = $1 THEN recipient_id
           ELSE requester_id
         END AS friend_id,
         u.username,
         u.full_name,
         u.email,
         u.created_at
       FROM friend_requests fr
       JOIN users u ON 
         (fr.requester_id = $1 AND u.id = fr.recipient_id) OR
         (fr.recipient_id = $1 AND u.id = fr.requester_id)
       WHERE fr.status = 'accepted'
       ORDER BY fr.updated_at DESC`,
      [req.user.userId]
    );

    // Get pending requests (received)
    const pendingRequestsResult = await dbQuery(
      `SELECT 
         fr.id,
         fr.requester_id,
         u.username,
         u.full_name,
         u.email,
         fr.created_at
       FROM friend_requests fr
       JOIN users u ON u.id = fr.requester_id
       WHERE fr.recipient_id = $1 AND fr.status = 'pending'
       ORDER BY fr.created_at DESC`,
      [req.user.userId]
    );

    res.json({
      friends: friendsResult.rows,
      pending_requests: pendingRequestsResult.rows,
      friend_count: friendsResult.rows.length,
      pending_count: pendingRequestsResult.rows.length
    });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/friends/:userId
 * Get specific user's friends (public info)
 */
router.get('/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const friendsResult = await dbQuery(
      `SELECT 
         CASE 
           WHEN requester_id = $1 THEN recipient_id
           ELSE requester_id
         END AS friend_id,
         u.username,
         u.full_name,
         u.email
       FROM friend_requests fr
       JOIN users u ON 
         (fr.requester_id = $1 AND u.id = fr.recipient_id) OR
         (fr.recipient_id = $1 AND u.id = fr.requester_id)
       WHERE fr.status = 'accepted'
       ORDER BY fr.updated_at DESC`,
      [userId]
    );

    res.json({
      friends: friendsResult.rows,
      friend_count: friendsResult.rows.length
    });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/friends/:userId
 * Remove friend
 */
router.delete('/:userId', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { userId } = req.params;
    const friendId = parseInt(userId);

    const result = await dbQuery(
      `DELETE FROM friend_requests 
       WHERE ((requester_id = $1 AND recipient_id = $2) 
           OR (requester_id = $2 AND recipient_id = $1))
         AND status = 'accepted'
       RETURNING *`,
      [req.user.userId, friendId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Friendship not found' });
      return;
    }

    await dbQuery(
      `UPDATE messages
       SET request_status = 'pending',
           updated_at = NOW()
       WHERE (sender_id = $1 AND recipient_id = $2)
          OR (sender_id = $2 AND recipient_id = $1)`,
      [req.user.userId, friendId]
    );

    res.json({ success: true, message: 'Friend removed' });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

export default router;
