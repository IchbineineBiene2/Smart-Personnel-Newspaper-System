import { Router, Request, Response } from 'express';
import { generateAIResponse, ChatRequest, ChatResponse } from '../services/aiService';

const router = Router();

/**
 * POST /api/ai/chat
 * Generate AI chat response based on user message and optional article context
 * 
 * Request body:
 * {
 *   message: string,
 *   articleContext?: {
 *     title?: string,
 *     summary?: string,
 *     content?: string,
 *     source?: string,
 *     category?: string
 *   },
 *   chatHistory?: Array<{id, role, content}>
 * }
 * 
 * Response:
 * {
 *   role: 'assistant',
 *   content: string,
 *   id: string,
 *   timestamp: string
 * }
 */
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { message, articleContext, chatHistory } = req.body as ChatRequest;

    // Validate request
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      res.status(400).json({ error: 'Message is required and must be non-empty' });
      return;
    }

    // Generate AI response (now async)
    const response: ChatResponse = await generateAIResponse({
      message: message.trim(),
      articleContext,
      chatHistory,
    });

    res.status(200).json(response);
  } catch (err) {
    const error = err as Error;
    console.error('[AI Chat] Error:', error.message);
    res.status(500).json({ error: 'Failed to generate response' });
  }
});

export default router;
