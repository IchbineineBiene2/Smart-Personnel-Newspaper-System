import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { query as dbQuery } from '../db/index';

export interface User {
  userId: number;
  username: string;
  fullName?: string;
  email: string;
  role: 'admin' | 'editor' | 'user' | 'publisher';
  status: 'active' | 'suspended' | 'deleted';
}

export interface JWTPayload extends User {
  iat: number;
  exp: number;
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-this-in-production-12345';
const JWT_EXPIRY = '7d';

/**
 * Hash password using SHA256
 */
export function hashPassword(password: string): string {
  return crypto.createHmac('sha256', JWT_SECRET).update(password).digest('hex');
}

/**
 * Verify password
 */
export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

/**
 * Generate JWT token
 */
export function generateToken(user: User): string {
  const payload: JWTPayload = {
    ...user,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
  };
  return jwt.sign(payload, JWT_SECRET);
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Register new user
 */
export async function registerUser(
  username: string,
  fullName: string,
  email: string,
  password: string
): Promise<User> {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedUsername = username.trim().toLowerCase();
  const normalizedFullName = fullName.trim();
  const passwordHash = hashPassword(password);

  const result = await dbQuery(
    `INSERT INTO users (username, full_name, email, password_hash, role, status)
     VALUES ($1, $2, $3, $4, 'user', 'active')
     RETURNING id, username, full_name, email, role, status`,
    [normalizedUsername, normalizedFullName, normalizedEmail, passwordHash]
  );

  const user = result.rows[0];
  return {
    userId: user.id,
    username: user.username,
    fullName: user.full_name,
    email: user.email,
    role: user.role,
    status: user.status,
  };
}

/**
 * Login user
 */
export async function loginUser(email: string, password: string): Promise<User | null> {
  const identity = email.trim().toLowerCase();
  const result = await dbQuery(
    `SELECT id, username, full_name, email, role, status, password_hash
     FROM users
     WHERE (LOWER(email) = $1 OR LOWER(username) = $1)
       AND status = 'active'`,
    [identity]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const user = result.rows[0];

  if (!verifyPassword(password, user.password_hash)) {
    return null;
  }

  return {
    userId: user.id,
    username: user.username,
    fullName: user.full_name,
    email: user.email,
    role: user.role,
    status: user.status,
  };
}

/**
 * Update user role
 */
export async function updateUserRole(userId: number, newRole: string): Promise<User> {
  const result = await dbQuery(
    `UPDATE users SET role = $1 WHERE id = $2
     RETURNING id, username, full_name, email, role, status`,
    [newRole, userId]
  );

  const user = result.rows[0];
  return {
    userId: user.id,
    username: user.username,
    fullName: user.full_name,
    email: user.email,
    role: user.role,
    status: user.status,
  };
}

/**
 * Update user status
 */
export async function updateUserStatus(userId: number, newStatus: string): Promise<User> {
  const result = await dbQuery(
    `UPDATE users SET status = $1 WHERE id = $2
     RETURNING id, username, full_name, email, role, status`,
    [newStatus, userId]
  );

  const user = result.rows[0];
  return {
    userId: user.id,
    username: user.username,
    fullName: user.full_name,
    email: user.email,
    role: user.role,
    status: user.status,
  };
}

/**
 * List users with pagination
 */
export async function listUsers(limit: number = 20, offset: number = 0) {
  const result = await dbQuery(
    `SELECT id, username, full_name, email, role, status, created_at FROM users
     ORDER BY created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  return result.rows;
}
