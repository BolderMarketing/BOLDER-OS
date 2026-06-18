// JWT verification middleware. Applied to every protected Express route.
// Token is read from the httpOnly cookie (browser) or Bearer header (tools/tests).
import jwt from 'jsonwebtoken';
import { env } from '../lib/env.js';

export const COOKIE_NAME = 'bolder_token';

export function signToken(payload) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token) {
  return jwt.verify(token, env.JWT_SECRET);
}

function extractToken(req) {
  if (req.cookies && req.cookies[COOKIE_NAME]) return req.cookies[COOKIE_NAME];
  const h = req.headers.authorization;
  if (h && h.startsWith('Bearer ')) return h.slice(7);
  return null;
}

// Require a valid token. Returns 401 otherwise. No exceptions.
export function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = verifyToken(token);
    return next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

// Require the admin role (Faris). Portal sessions are rejected from internal routes.
export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  return next();
}
