// One-off (non-retainer) projects CRUD.
import { Router } from 'express';
import { supabase, unwrap } from '../lib/supabase.js';

const router = Router();
const STAGES = ['not_started', 'research', 'building', 'review', 'submitted', 'done'];

router.get('/', async (req, res, next) => {
  try {
    let q = supabase().from('projects').select('*, clients(name, tier)');
    if (req.query.client_id) q = q.eq('client_id', req.query.client_id);
    q = q.order('due_date', { ascending: true, nullsFirst: false });
    res.json(unwrap(await q));
  } catch (e) {
    next(e);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const b = req.body || {};
    if (!b.name) return res.status(400).json({ error: 'Project name required.' });
    if (b.stage && !STAGES.includes(b.stage)) return res.status(400).json({ error: 'Invalid stage.' });
    const payload = pick(b, ['client_id', 'name', 'description', 'stage', 'due_date']);
    const data = unwrap(await supabase().from('projects').insert(payload).select().single());
    res.status(201).json(data);
  } catch (e) {
    next(e);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const b = req.body || {};
    if (b.stage && !STAGES.includes(b.stage)) return res.status(400).json({ error: 'Invalid stage.' });
    const payload = pick(b, ['client_id', 'name', 'description', 'stage', 'due_date']);
    const data = unwrap(
      await supabase().from('projects').update(payload).eq('id', req.params.id).select().single()
    );
    res.json(data);
  } catch (e) {
    next(e);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    unwrap(await supabase().from('projects').delete().eq('id', req.params.id));
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
