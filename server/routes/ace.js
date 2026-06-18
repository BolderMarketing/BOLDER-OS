// ACE AI endpoints. Builds grounded context from Supabase, calls Claude
// server-side, slop-checks the output before returning.
import { Router } from 'express';
import { supabase, unwrap } from '../lib/supabase.js';
import { anthropic, ACE_SYSTEM } from '../lib/anthropic.js';
import { deslop } from '../lib/slop-check.js';
import { env } from '../lib/env.js';
import { monthCycle, weekBounds, todayIso } from '../lib/dates.js';

const router = Router();

// Build a compact, PII-light context block of current state for the model.
async function buildContext() {
  const cycle = monthCycle();
  const { start, end } = weekBounds();

  const clients = unwrap(
    await supabase().from('clients').select('id, name, tier, status').eq('status', 'active')
  );
  const tasks = unwrap(
    await supabase()
      .from('deliverables')
      .select('title, service_type, stage, priority, due_date, clients(name)')
      .eq('month_cycle', cycle)
      .neq('stage', 'done')
  );

  const nameOf = (t) => t.clients?.name || 'Unassigned';
  const line = (t) =>
    `- [${t.priority}] ${nameOf(t)}: ${t.title} (${t.service_type}, ${t.stage}${t.due_date ? `, due ${t.due_date}` : ''})`;

  const critical = tasks.filter((t) => t.priority === 'critical').map(line);
  const high = tasks.filter((t) => t.priority === 'high').map(line);
  const overdue = tasks.filter((t) => t.due_date && t.due_date < todayIso()).map(line);

  return `Today: ${todayIso()} | Cycle: ${cycle} | This week: ${start}..${end}
Active clients: ${clients.map((c) => `${c.name} (${c.tier || 'no tier'})`).join(', ') || 'none'}

OVERDUE (${overdue.length}):
${overdue.join('\n') || '(none)'}

CRITICAL open (${critical.length}):
${critical.join('\n') || '(none)'}

HIGH open (${high.length}):
${high.join('\n') || '(none)'}`;
}

// POST /api/ace/ask  body: { prompt }
router.post('/ask', async (req, res, next) => {
  try {
    const { prompt } = req.body || {};
    if (!prompt) return res.status(400).json({ error: 'prompt required.' });

    const context = await buildContext();
    const aiClient = anthropic();
    const msg = await aiClient.messages.create({
      model: env.ACE_MODEL,
      max_tokens: 1500,
      system: `${ACE_SYSTEM}\n\nCurrent BOLDER state:\n${context}`,
      messages: [{ role: 'user', content: prompt }],
    });
    const raw = msg.content?.[0]?.text?.trim() || '';
    const { text, flagged } = await deslop(raw);
    res.json({ response: text, slop_corrected: flagged });
  } catch (e) {
    next(e);
  }
});

// GET /api/ace/focus — ACE's "what needs you today" one-liner for the dashboard.
router.get('/focus', async (req, res, next) => {
  try {
    const context = await buildContext();
    let summary;
    try {
      const aiClient = anthropic();
      const msg = await aiClient.messages.create({
        model: env.ACE_MODEL,
        max_tokens: 300,
        system: ACE_SYSTEM,
        messages: [
          {
            role: 'user',
            content: `Based on this state, give Faris a 1-2 sentence "what needs you today" summary. Direct, scannable, no fluff.\n\n${context}`,
          },
        ],
      });
      summary = (await deslop(msg.content?.[0]?.text?.trim() || '')).text;
    } catch {
      summary = null; // ACE offline — frontend falls back to its own count.
    }
    res.json({ summary });
  } catch (e) {
    next(e);
  }
});

export default router;
