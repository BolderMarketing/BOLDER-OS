// Reports: list, get, ACE-draft, approve, send (mock), and report queue.
import { Router } from 'express';
import { supabase, unwrap } from '../lib/supabase.js';
import { monthCycle } from '../lib/dates.js';
import { draftReportHtml } from '../lib/reportWriter.js';

const router = Router();

// GET /api/reports?client_id=&month_cycle=&status=
router.get('/', async (req, res, next) => {
  try {
    let q = supabase().from('reports').select('*, clients(name, tier)');
    for (const key of ['client_id', 'month_cycle', 'status']) {
      if (req.query[key]) q = q.eq(key, req.query[key]);
    }
    q = q.order('created_at', { ascending: false });
    res.json(unwrap(await q));
  } catch (e) {
    next(e);
  }
});

// GET /api/reports/queue — every active client's report status for a cycle.
// Drives the "Report Queue" PM view.
router.get('/queue', async (req, res, next) => {
  try {
    const cycle = req.query.month_cycle || monthCycle();
    const clients = unwrap(
      await supabase().from('clients').select('*').eq('status', 'active').order('name')
    );
    const reports = unwrap(
      await supabase().from('reports').select('*').eq('month_cycle', cycle)
    );

    const byClient = {};
    for (const r of reports) (byClient[r.client_id] ||= []).push(r);

    const queue = clients.map((c) => {
      const reportType = c.tier === 'authority' ? 'biweekly' : 'monthly';
      const existing = byClient[c.id] || [];
      return {
        client_id: c.id,
        client_name: c.name,
        tier: c.tier,
        report_type: reportType,
        month_cycle: cycle,
        reports: existing,
        status: existing[0]?.status || 'not_started',
      };
    });
    res.json({ month_cycle: cycle, queue });
  } catch (e) {
    next(e);
  }
});

// GET /api/reports/:id
router.get('/:id', async (req, res, next) => {
  try {
    const data = unwrap(
      await supabase().from('reports').select('*, clients(name, tier)').eq('id', req.params.id).maybeSingle()
    );
    if (!data) return res.status(404).json({ error: 'Report not found.' });
    res.json(data);
  } catch (e) {
    next(e);
  }
});

// POST /api/reports/draft  body: { client_id, month_cycle?, report_type? }
// ACE drafts the report HTML, stores it, and queues it for approval.
router.post('/draft', async (req, res, next) => {
  try {
    const { client_id } = req.body || {};
    if (!client_id) return res.status(400).json({ error: 'client_id required.' });
    const cycle = req.body.month_cycle || monthCycle();

    const client = unwrap(
      await supabase().from('clients').select('*').eq('id', client_id).maybeSingle()
    );
    if (!client) return res.status(404).json({ error: 'Client not found.' });

    const report_type = req.body.report_type || (client.tier === 'authority' ? 'biweekly' : 'monthly');

    // Pull this cycle's completed work to ground the report (no raw PII).
    const tasks = unwrap(
      await supabase()
        .from('deliverables')
        .select('title, service_type, stage, priority')
        .eq('client_id', client_id)
        .eq('month_cycle', cycle)
    );

    const html = await draftReportHtml({ client, cycle, report_type, tasks });

    const report = unwrap(
      await supabase()
        .from('reports')
        .insert({
          client_id,
          month_cycle: cycle,
          report_type,
          status: 'pending_approval',
          html_content: html,
        })
        .select()
        .single()
    );

    // Queue for Faris approval (client-facing artifact).
    unwrap(
      await supabase().from('approval_queue').insert({
        type: 'report',
        reference_id: report.id,
        payload: { client_name: client.name, month_cycle: cycle, report_type },
        status: 'pending',
      })
    );

    res.status(201).json(report);
  } catch (e) {
    next(e);
  }
});

// POST /api/reports/:id/approve
router.post('/:id/approve', async (req, res, next) => {
  try {
    const data = unwrap(
      await supabase()
        .from('reports')
        .update({ status: 'approved', approved_at: new Date().toISOString() })
        .eq('id', req.params.id)
        .select()
        .single()
    );
    // Resolve any pending approval entry.
    unwrap(
      await supabase()
        .from('approval_queue')
        .update({ status: 'approved', resolved_at: new Date().toISOString() })
        .eq('reference_id', req.params.id)
        .eq('type', 'report')
        .eq('status', 'pending')
    );
    res.json(data);
  } catch (e) {
    next(e);
  }
});

// POST /api/reports/:id/send  (Phase 2 = real email; Phase 1 just marks sent)
router.post('/:id/send', async (req, res, next) => {
  try {
    const report = unwrap(
      await supabase().from('reports').select('*').eq('id', req.params.id).maybeSingle()
    );
    if (!report) return res.status(404).json({ error: 'Report not found.' });
    if (report.status !== 'approved') {
      return res.status(400).json({ error: 'Report must be approved before sending.' });
    }
    const data = unwrap(
      await supabase()
        .from('reports')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', req.params.id)
        .select()
        .single()
    );
    res.json(data);
  } catch (e) {
    next(e);
  }
});

export default router;
