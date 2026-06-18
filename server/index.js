// BOLDER OS — Express API entry point.
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { env, isProd, isDemo, allowedOrigins } from './lib/env.js';
import { requireAuth, requireAdmin } from './middleware/auth.js';
import { apiLimiter } from './middleware/rateLimit.js';

import authRoutes from './routes/auth.js';
import clientRoutes from './routes/clients.js';
import deliverableRoutes from './routes/deliverables.js';
import projectRoutes from './routes/projects.js';
import reportRoutes from './routes/reports.js';
import approvalRoutes from './routes/approvals.js';
import monthlyRoutes from './routes/monthly.js';
import aceRoutes from './routes/ace.js';
import twilioWebhook from './routes/webhooks/twilio.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.set('trust proxy', 1); // Replit sits behind a proxy (needed for rate-limit IPs + secure cookies)

// --- CORS: locked to the configured client origin(s), credentials on ---
app.use(
  cors({
    origin(origin, cb) {
      // Allow same-origin / server-to-server (no Origin header) and allow-listed origins.
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

app.use(cookieParser());

// Health check (open).
app.get('/api/health', (req, res) => res.json({ ok: true, service: 'bolder-os', env: env.NODE_ENV, demo: isDemo }));

// --- Twilio webhook: urlencoded body, NO JWT (signature-gated), mounted first ---
app.use('/api/webhooks/twilio', express.urlencoded({ extended: false }), twilioWebhook);

// --- Everything else is JSON + rate-limited ---
app.use('/api', apiLimiter, express.json({ limit: '1mb' }));

// Auth routes (login/logout are public; /me is protected internally).
app.use('/api/auth', authRoutes);

// All internal modules require a valid admin JWT. No exceptions.
app.use('/api/clients', requireAuth, requireAdmin, clientRoutes);
app.use('/api/deliverables', requireAuth, requireAdmin, deliverableRoutes);
app.use('/api/projects', requireAuth, requireAdmin, projectRoutes);
app.use('/api/reports', requireAuth, requireAdmin, reportRoutes);
app.use('/api/approvals', requireAuth, requireAdmin, approvalRoutes);
app.use('/api/monthly', requireAuth, requireAdmin, monthlyRoutes);
app.use('/api/ace', requireAuth, requireAdmin, aceRoutes);

// --- Serve the built React app in production (Replit single-service deploy) ---
if (isProd) {
  const clientDist = path.resolve(__dirname, '../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// --- Central error handler ---
app.use((err, req, res, next) => {
  if (err?.message === 'Not allowed by CORS') return res.status(403).json({ error: 'CORS blocked' });
  const status = err.status || 500;
  if (status >= 500) console.error('[error]', err);
  res.status(status).json({ error: err.publicMessage || (status >= 500 ? 'Server error' : err.message) });
});

app.listen(env.PORT, () => {
  console.log(`BOLDER OS API running on :${env.PORT} (${env.NODE_ENV})`);
  if (isDemo) {
    console.log('────────────────────────────────────────────');
    console.log(' DEMO MODE — in-memory data, no database needed');
    console.log(' Login:  faris@bolder.biz  /  bolder');
    console.log(' (set SUPABASE_URL + SUPABASE_SERVICE_KEY to use the real DB)');
    console.log('────────────────────────────────────────────');
  }
});

export default app;
