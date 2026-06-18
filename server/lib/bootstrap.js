// First-boot bootstrap for the REAL database (skipped in demo mode).
// When the users table is empty and ADMIN_EMAIL / ADMIN_PASSWORD are set,
// creates the admin login and seeds the two known clients. Safe + idempotent:
// it only acts on an empty users table, so restarts won't duplicate anything.
import bcrypt from 'bcryptjs';
import { supabase } from './supabase.js';

export async function ensureBootstrap() {
  const email = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD || '';

  if (!email || !password) {
    console.log('[bootstrap] Set ADMIN_EMAIL + ADMIN_PASSWORD to auto-create your login on first boot.');
    return;
  }

  // Count existing users. If the table is missing, the schema hasn't been run yet.
  const { count, error } = await supabase()
    .from('users')
    .select('id', { count: 'exact', head: true });

  if (error) {
    console.warn(
      '[bootstrap] Could not read users table — run supabase/schema.sql in the ' +
        'Supabase SQL editor first. Details: ' + error.message
    );
    return;
  }

  if (count > 0) {
    console.log('[bootstrap] Admin already exists — skipping.');
    return;
  }

  // Create the admin login.
  const password_hash = await bcrypt.hash(password, 12);
  const { error: uErr } = await supabase().from('users').insert({ email, password_hash, role: 'admin' });
  if (uErr) {
    console.error('[bootstrap] Failed to create admin:', uErr.message);
    return;
  }
  console.log(`[bootstrap] Created admin login: ${email}`);

  // Seed the two known clients (tier left unset — set it in the Clients panel).
  const clients = [
    {
      name: 'Body In Gear',
      industry: 'Physical therapy clinic, Palatine IL',
      contact_name: 'Zach',
      status: 'active',
      notes: 'Email marketing, Google reviews, PT treatment plans.',
    },
    {
      name: 'Owaynat Law Group',
      industry: 'Law firm, Chicago IL',
      status: 'active',
      notes: 'Courtroom presentations, website build in progress.',
    },
  ];
  const { error: cErr } = await supabase().from('clients').insert(clients);
  if (cErr) console.warn('[bootstrap] Client seed skipped:', cErr.message);
  else console.log('[bootstrap] Seeded clients: Body In Gear, Owaynat Law Group');
}
