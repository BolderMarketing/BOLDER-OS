// Auth routes: login, logout, current user. JWT in an httpOnly cookie.
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { supabase, unwrap } from '../lib/supabase.js';
import { env, isProd } from '../lib/env.js';
import { signToken, requireAuth, COOKIE_NAME } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';

const router = Router();

const cookieOpts = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
};

// POST /api/auth/login
router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required.' });
    }

    const user = unwrap(
      await supabase().from('users').select('*').eq('email', email.toLowerCase().trim()).maybeSingle()
    );

    // Constant-ish response: same error whether user missing or password wrong.
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const token = signToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      portal_client_id: user.portal_client_id || null,
    });

    res.cookie(COOKIE_NAME, token, cookieOpts);
    return res.json({
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (e) {
    next(e);
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, { ...cookieOpts, maxAge: undefined });
  res.json({ ok: true });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: { id: req.user.sub, email: req.user.email, role: req.user.role } });
});

export default router;
