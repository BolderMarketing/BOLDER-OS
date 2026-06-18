// ACE Approval Queue: list pending, approve, reject (logs reason to ace_feedback).
import { Router } from 'express';
import { supabase, unwrap } from '../lib/supabase.js';

const router = Router();

// GET /api/approvals?status=pending
router.get('/', async (req, res, next) => {
  try {
    let q = supabase().from('approval_queue').select('*').order('created_at', { ascending: false });
    if (req.query.status) q = q.eq('status', req.query.status);
    res.json(unwrap(await q));
  } catch (e) {
    next(e);
  }
});

// GET /api/approvals/count — pending count for the top-bar bell badge.
router.get('/count', async (req, res, next) => {
  try {
    const { count, error } = await supabase()
      .from('approval_queue')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending');
    if (error) throw error;
    res.json({ count: count || 0 });
  } catch (e) {
    next(e);
  }
});

// POST /api/approvals/:id/approve — applies the side effect based on type.
router.post('/:id/approve', async (req, res, next) => {
  try {
    const item = unwrap(
      await supabase().from('approval_queue').select('*').eq('id', req.params.id).maybeSingle()
    );
    if (!item) return res.status(404).json({ error: 'Approval item not found.' });
    if (item.status !== 'pending') return res.status(400).json({ error: 'Already resolved.' });

    // Apply side effects.
    if (item.type === 'task_complete' && item.reference_id) {
      unwrap(
        await supabase()
          .from('deliverables')
          .update({ stage: 'done', completed_at: new Date().toISOString() })
          .eq('id', item.reference_id)
      );
    } else if (item.type === 'report' && item.reference_id) {
      unwrap(
        await supabase()
          .from('reports')
          .update({ status: 'approved', approved_at: new Date().toISOString() })
          .eq('id', item.reference_id)
      );
    }

    const updated = unwrap(
      await supabase()
        .from('approval_queue')
        .update({ status: 'approved', resolved_at: new Date().toISOString() })
        .eq('id', req.params.id)
        .select()
        .single()
    );
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

// POST /api/approvals/:id/reject  body: { rejection_reason }
router.post('/:id/reject', async (req, res, next) => {
  try {
    const { rejection_reason } = req.body || {};
    const item = unwrap(
      await supabase().from('approval_queue').select('*').eq('id', req.params.id).maybeSingle()
    );
    if (!item) return res.status(404).json({ error: 'Approval item not found.' });

    const updated = unwrap(
      await supabase()
        .from('approval_queue')
        .update({
          status: 'rejected',
          rejection_reason: rejection_reason || null,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', req.params.id)
        .select()
        .single()
    );

    // Log to the learning system.
    unwrap(
      await supabase().from('ace_feedback').insert({
        output_type: item.type,
        rejection_reason: rejection_reason || null,
        raw_output: item.payload ? JSON.stringify(item.payload) : null,
      })
    );

    // For a rejected report, drop it back to draft so ACE can revise.
    if (item.type === 'report' && item.reference_id) {
      unwrap(await supabase().from('reports').update({ status: 'draft' }).eq('id', item.reference_id));
    }
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

export default router;
