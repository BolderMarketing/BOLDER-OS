// Monthly cycle auto-generation.
// On the 1st (cron / manual trigger) build the full task checklist for every
// active client based on their tier. Idempotent per client+cycle.
import { Router } from 'express';
import { supabase, unwrap } from '../lib/supabase.js';
import { checklistForTier } from '../lib/checklists.js';
import { monthCycle, dateInCycle } from '../lib/dates.js';

const router = Router();

// POST /api/monthly/generate  body: { month_cycle?, client_id? }
router.post('/generate', async (req, res, next) => {
  try {
    const cycle = req.body?.month_cycle || monthCycle();

    let clientQuery = supabase().from('clients').select('*').eq('status', 'active');
    if (req.body?.client_id) clientQuery = clientQuery.eq('id', req.body.client_id);
    const clients = unwrap(await clientQuery);

    const results = [];
    for (const client of clients) {
      if (!client.tier) {
        results.push({ client: client.name, skipped: 'no tier set' });
        continue;
      }

      // Skip if this client already has recurring tasks for this cycle.
      const existing = unwrap(
        await supabase()
          .from('deliverables')
          .select('id')
          .eq('client_id', client.id)
          .eq('month_cycle', cycle)
          .eq('is_recurring', true)
      );
      if (existing.length) {
        results.push({ client: client.name, skipped: 'already generated', existing: existing.length });
        continue;
      }

      const template = checklistForTier(client.tier);
      const rows = template.map((t) => ({
        client_id: client.id,
        title: t.title,
        service_type: t.service_type,
        stage: t.stage,
        priority: t.priority,
        due_date: dateInCycle(cycle, t.dueDay),
        month_cycle: cycle,
        is_recurring: true,
      }));

      const inserted = unwrap(await supabase().from('deliverables').insert(rows).select('id'));
      results.push({ client: client.name, tier: client.tier, created: inserted.length });
    }

    res.json({ month_cycle: cycle, results });
  } catch (e) {
    next(e);
  }
});

export default router;
