// One-time bootstrap: create the admin user (Faris) and seed known clients.
// Usage:
//   ADMIN_EMAIL=faris@bolder.biz ADMIN_PASSWORD='your-strong-pw' node scripts/seed.js
// Safe to re-run: upserts by unique email / client name (won't duplicate).
import bcrypt from 'bcryptjs';
import { supabase, unwrap } from '../lib/supabase.js';

async function run() {
  const email = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD || '';

  if (!email || !password) {
    console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD env vars.');
    process.exit(1);
  }

  // --- Admin user ---
  const existing = unwrap(await supabase().from('users').select('id').eq('email', email).maybeSingle());
  const password_hash = await bcrypt.hash(password, 12);
  if (existing) {
    unwrap(await supabase().from('users').update({ password_hash, role: 'admin' }).eq('id', existing.id));
    console.log(`Updated admin: ${email}`);
  } else {
    unwrap(await supabase().from('users').insert({ email, password_hash, role: 'admin' }));
    console.log(`Created admin: ${email}`);
  }

  // --- Known clients (tier TBD per skill file; leave null until Faris sets it) ---
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

  for (const c of clients) {
    const found = unwrap(await supabase().from('clients').select('id').eq('name', c.name).maybeSingle());
    if (found) {
      console.log(`Client exists: ${c.name}`);
    } else {
      unwrap(await supabase().from('clients').insert(c));
      console.log(`Seeded client: ${c.name}`);
    }
  }

  console.log('Seed complete.');
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
