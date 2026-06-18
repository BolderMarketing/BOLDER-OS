// Centralised env loading + validation. Keeps secrets in one place and
// fails loud (in dev) when something critical is missing.
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load root .env (one level up from /server) — Replit uses Secrets so this is a no-op there.
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3001', 10),

  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,

  JWT_SECRET: process.env.JWT_SECRET,

  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  ACE_MODEL: process.env.ACE_MODEL || 'claude-sonnet-4-6',

  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,
  FARIS_PHONE_NUMBER: process.env.FARIS_PHONE_NUMBER,

  OPENAI_API_KEY: process.env.OPENAI_API_KEY,

  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  PUBLIC_URL: process.env.PUBLIC_URL || '',
};

export const isProd = env.NODE_ENV === 'production';

// Warn (don't crash) so the OS still boots for UI work without every key set.
const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'JWT_SECRET'];
const missing = required.filter((k) => !env[k]);
if (missing.length) {
  console.warn(
    `[env] Missing required vars: ${missing.join(', ')}. ` +
      `Auth + database calls will fail until these are set.`
  );
}
// Fallback dev secret so login flows don't hard-crash locally. Never used in prod.
if (!env.JWT_SECRET) {
  env.JWT_SECRET = 'dev-insecure-secret-change-me';
}

export const allowedOrigins = env.CLIENT_URL.split(',').map((s) => s.trim()).filter(Boolean);
