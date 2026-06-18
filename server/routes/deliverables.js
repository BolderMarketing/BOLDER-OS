// Deliverables (tasks) CRUD + stage advancement.
// Rule (skill + Phase1): marking a CRITICAL task done routes through the
// approval queue instead of completing immediately.
import { Router } from 'express';
import { supabase, unwrap } from '../lib/supabase.js';
import { monthCycle } from '../lib/dates.js';

const router = Router();

const SERVICE_TYPES = ['seo', 'geo', 'web', 'content', 'report', 'reddit', 'other'];
const STAGES = ['not_started', 'research', 'building', 'review', 'submitted', 'done'];
const PRIORITIES = ['critical', 'high', 'normal', 'low'];

// GET /api/deliverables  — supports ?client_id= &stage= &service_type= &priority= &month_cycle=
router.get('/', async (req, res, next) => {
  try {
    let q = supabase().from('deliverables').select('*, clients(name, tier)');
    for (const key of ['client_id', 'stage', 'service_type', 'priority', 'month_cycle']) {
      if (req.query[key]) q = q.eq(key, req.query[key]);
    }
    q = q.order('due_date', { ascending: true, nullsFirst: false }).order('created_at', { ascending: true });
    res.json(unwrap(await q));
  } catch (e) {
    next(e);
  }
});

// POST /api/deliverables
router.post('/', async (req, res, next) => {
  try {
    const b = req.body || {};
    if (!b.title) return res.status(400).json({ error: 'Title required.' });
    if (b.service_type && !SERVICE_TYPES.includes(b.service_type))
      return res.status(400).json({ error: 'Invalid service_type.' });
    if (b.stage && !STAGES.includes(b.stage)) return res.status(400).json({ error: 'Invalid stage.' });
    if (b.priority && !PRIORITIES.includes(b.priority))
      return res.status(400).json({ error: 'Invalid priority.' });

    const payload = pick(b, [
      'client_id', 'title', 'service_type', 'stage', 'priority',
      'due_date', 'month_cycle', 'is_recurring', 'notes',
    ]);
    if (!payload.month_cycle) payload.month_cycle = monthCycle();

    const data = unwrap(await supabase().from('deliverables').insert(payload).select().single());
    res.status(201).json(data);
  } catch (e) {
    next(e);
  }
});

// PATCH /api/deliverables/:id
router.patch('/:id', async (req, res, next) => {
  try {
    const b = req.body || {};
    if (b.service_type && !SERVICE_TYPES.includes(b.service_type))
      return res.status(400).json({ error: 'Invalid service_type.' });
    if (b.stage && !STAGES.includes(b.stage)) return res.status(400).json({ error: 'Invalid stage.' });
    if (b.priority && !PRIORITIES.includes(b.priority))
      return res.status(400).json({ error: 'Invalid priority.' });

    const existing = unwrap(
      await supabase().from('deliverables').select('*').eq('id', req.params.id).maybeSingle()
    );
    if (!existing) return res.status(404).json({ error: 'Task not found.' });

    const effectivePriority = b.priority || existing.priority;

    // Marking a CRITICAL task done -> approval queue, hold at 'review'.
    if (b.stage === 'done' && effectivePriority === 'critical' && existing.stage !== 'done') {
      // Avoid duplicate pending approvals for the same task.
      const pending = unwrap(
        await supabase()
          .from('approval_queue')
          .select('id')
          .eq('type', 'task_complete')
          .eq('reference_id', existing.id)
          .eq('status', 'pending')
      );
      if (!pending.length) {
        unwrap(
          await supabase().from('approval_queue').insert({
            type: 'task_complete',
            reference_id: existing.id,
            payload: { title: existing.title, client_id: existing.client_id },
            status: 'pending',
          })
        );
      }
      // Hold the task in review until Faris approves the completion.
      const held = unwrap(
        await supabase()
          .from('deliverables')
          .update({ ...stagePatch(b, 'review'), priority: effectivePriority })
          .eq('id', existing.id)
          .select()
          .single()
      );
      return res.json({ ...held, _approval_required: true });
    }

    const payload = pick(b, [
      'client_id', 'title', 'service_type', 'stage', 'priority',
      'due_date', 'month_cycle', 'is_recurring', 'notes',
    ]);
    // Auto stamp / clear completed_at on stage transitions to/from done.
    if (b.stage === 'done') payload.completed_at = new Date().toISOString();
    if (b.stage && b.stage !== 'done') payload.completed_at = null;

    const data = unwrap(
      await supabase().from('deliverables').update(payload).eq('id', req.params.id).select().single()
    );
    res.json(data);
  } catch (e) {
    next(e);
  }
});

// DELETE /api/deliverables/:id
router.delete('/:id', async (req, res, next) => {
  try {
    unwrap(await supabase().from('deliverables').delete().eq('id', req.params.id));
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

function stagePatch(body, fallbackStage) {
  const out = pick(body, ['title', 'priority', 'notes', 'due_date']);
  out.stage = fallbackStage;
  return out;
}

function pick(obj, keys) {
  const out = {};
  for (const k of keys) if (obj[k] !== undefined) out[k] = obj[k] === '' ? null : obj[k];
  return out;
}

export default router;
