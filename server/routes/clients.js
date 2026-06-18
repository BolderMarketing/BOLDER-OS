// Clients CRUD. All routes require admin auth (mounted behind requireAuth).
import { Router } from 'express';
import { supabase, unwrap } from '../lib/supabase.js';

const router = Router();

const TIERS = ['starter', 'momentum', 'authority'];
const STATUSES = ['active', 'paused', 'churned'];

// GET /api/clients
router.get('/', async (req, res, next) => {
  try {
    const data = unwrap(
      await supabase().from('clients').select('*').order('name', { ascending: true })
    );
    res.json(data);
  } catch (e) {
    next(e);
  }
});

// GET /api/clients/:id
router.get('/:id', async (req, res, next) => {
  try {
    const data = unwrap(
      await supabase().from('clients').select('*').eq('id', req.params.id).maybeSingle()
    );
    if (!data) return res.status(404).json({ error: 'Client not found.' });
    res.json(data);
  } catch (e) {
    next(e);
  }
});

// POST /api/clients
router.post('/', async (req, res, next) => {
  try {
    const b = req.body || {};
    if (!b.name) return res.status(400).json({ error: 'Client name required.' });
    if (b.tier && !TIERS.includes(b.tier)) return res.status(400).json({ error: 'Invalid tier.' });
    if (b.status && !STATUSES.includes(b.status)) return res.status(400).json({ error: 'Invalid status.' });

    const payload = pick(b, [
      'name', 'industry', 'contact_name', 'contact_email', 'contact_phone',
      'tier', 'monthly_rate', 'start_date', 'commitment_end_date', 'status', 'notes',
    ]);

    const data = unwrap(await supabase().from('clients').insert(payload).select().single());
    res.status(201).json(data);
  } catch (e) {
    next(e);
  }
});

// PATCH /api/clients/:id
router.patch('/:id', async (req, res, next) => {
  try {
    const b = req.body || {};
    if (b.tier && !TIERS.includes(b.tier)) return res.status(400).json({ error: 'Invalid tier.' });
    if (b.status && !STATUSES.includes(b.status)) return res.status(400).json({ error: 'Invalid status.' });

    const payload = pick(b, [
      'name', 'industry', 'contact_name', 'contact_email', 'contact_phone',
      'tier', 'monthly_rate', 'start_date', 'commitment_end_date', 'status', 'notes',
    ]);

    const data = unwrap(
      await supabase().from('clients').update(payload).eq('id', req.params.id).select().single()
    );
    res.json(data);
  } catch (e) {
    next(e);
  }
});

// DELETE /api/clients/:id
router.delete('/:id', async (req, res, next) => {
  try {
    unwrap(await supabase().from('clients').delete().eq('id', req.params.id));
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

function pick(obj, keys) {
  const out = {};
  for (const k of keys) if (obj[k] !== undefined) out[k] = obj[k] === '' ? null : obj[k];
  return out;
}

export default router;
