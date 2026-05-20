import { Request, Response, NextFunction } from 'express';
import { verifyToken, JWTPayload } from '../models/authModel';

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

/**
 * Authentication middleware - validates JWT token
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.slice(7);
  const user = verifyToken(token);

  if (!user) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  req.user = user;
  next();
}

/**
 * Optional auth — parses Bearer token if present, never blocks.
 * Sets req.user when valid, otherwise leaves it undefined.
 * Use for endpoints where guests are allowed but signed-in users get extras
 * (e.g. personalized /api/news ranking, "Sizin İçin" filter).
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const user = verifyToken(token);
    if (user) req.user = user;
  }
  next();
}

/**
 * Admin-only middleware
 */
export function adminMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}

/**
 * Editor or Admin middleware
 */
export function editorMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'editor')) {
    res.status(403).json({ error: 'Editor or admin access required' });
    return;
  }
  next();
}
