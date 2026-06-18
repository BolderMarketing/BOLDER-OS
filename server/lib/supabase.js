// Supabase client using the SERVICE ROLE key. Server-side ONLY.
// This key bypasses RLS — it must never reach the frontend.
import { createClient } from '@supabase/supabase-js';
import { env, isDemo } from './env.js';
import { demoClient, seedDemo } from './demoStore.js';

let _client = null;

export function supabase() {
  // Demo mode: in-memory store stands in for Supabase (no DB / keys needed).
  if (isDemo) {
    seedDemo();
    return demoClient;
  }
  if (!_client) {
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
      throw new Error('Supabase not configured (SUPABASE_URL / SUPABASE_SERVICE_KEY).');
    }
    _client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _client;
}

// Small helper: throw on supabase errors so routes can try/catch uniformly.
export function unwrap({ data, error }) {
  if (error) {
    const err = new Error(error.message || 'Database error');
    err.status = 400;
    err.details = error;
    throw err;
  }
  return data;
}
