// ACE monthly/biweekly report drafting -> clean branded HTML.
// Standards from pm-workflow.md "MONTHLY REPORT STANDARDS".
import { anthropic, ACE_SYSTEM } from './anthropic.js';
import { deslop } from './slop-check.js';
import { env } from './env.js';

// Build the report body via Claude, then wrap in branded HTML shell.
// PII is NOT passed raw — only client name, industry, tier, and task titles.
export async function draftReportHtml({ client, cycle, report_type, tasks = [] }) {
  const completed = tasks.filter((t) => t.stage === 'done' || t.stage === 'submitted');
  const inProgress = tasks.filter((t) => !['done', 'submitted', 'not_started'].includes(t.stage));

  const prompt = `Draft a ${report_type} performance report for client "${client.name}" (${client.industry || 'service business'}), ${cycle}.

Audience: non-technical business owner. Plain English. No marketer jargon unless explained.

Work completed this cycle:
${completed.map((t) => `- ${t.title} [${t.service_type}]`).join('\n') || '- (summarize setup / foundational work)'}

In progress:
${inProgress.map((t) => `- ${t.title} [${t.service_type}]`).join('\n') || '- (none)'}

Write the report body as semantic HTML using <h2>, <h3>, <p>, <ul>/<li> only (no <html>, <head>, <body>, no inline styles, no <style>). Required sections, in order:
1. Summary
2. Rankings & Visibility
3. Traffic
4. GEO / AI Mentions
5. Reddit Performance
6. Content Published
7. Work Completed
8. What This Means For You  (translate the data into business impact, plain English)
9. Next Month Priorities

Use realistic placeholder framing where exact numbers aren't provided (e.g. "rankings tracked across your target keywords"). Keep it tight and confident. Return only the HTML body.`;

  let body;
  try {
    const client_ai = anthropic();
    const msg = await client_ai.messages.create({
      model: env.ACE_MODEL,
      max_tokens: 3000,
      system: ACE_SYSTEM,
      messages: [{ role: 'user', content: prompt }],
    });
    body = msg.content?.[0]?.text?.trim() || '';
  } catch (e) {
    body = fallbackBody(client, cycle, completed);
  }

  const cleaned = (await deslop(body)).text;
  return wrapHtml({ client, cycle, report_type, body: cleaned });
}

function fallbackBody(client, cycle, completed) {
  return `<h2>Summary</h2><p>Here's where ${client.name} stands for ${cycle}.</p>
<h2>Work Completed</h2><ul>${completed.map((t) => `<li>${escapeHtml(t.title)}</li>`).join('') || '<li>Foundational setup</li>'}</ul>
<h2>What This Means For You</h2><p>We built the groundwork this cycle that compounds into more visibility and leads next month.</p>
<h2>Next Month Priorities</h2><ul><li>Keep momentum on rankings and content.</li></ul>`;
}

// Branded HTML shell — black/white base, BOLDER branding, clean + print-friendly.
function wrapHtml({ client, cycle, report_type, body }) {
  const label = report_type === 'biweekly' ? 'Bi-Weekly Report' : 'Monthly Report';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(client.name)} — ${label} ${cycle}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, 'Inter', system-ui, sans-serif; color:#111; background:#fff; margin:0; line-height:1.6; }
  .wrap { max-width: 760px; margin: 0 auto; padding: 48px 32px; }
  .head { border-bottom: 2px solid #000; padding-bottom: 16px; margin-bottom: 32px; display:flex; justify-content:space-between; align-items:flex-end; }
  .brand { font-weight: 800; letter-spacing: 1px; font-size: 22px; }
  .brand small { display:block; font-weight:400; letter-spacing:4px; font-size:9px; color:#666; }
  .meta { text-align:right; font-size:13px; color:#666; }
  h2 { font-size: 18px; margin: 32px 0 8px; border-bottom:1px solid #e5e5e5; padding-bottom:6px; }
  h3 { font-size: 15px; margin: 20px 0 6px; }
  p, li { font-size: 14px; }
  ul { padding-left: 20px; }
  .foot { margin-top: 48px; border-top:1px solid #e5e5e5; padding-top:16px; font-size:12px; color:#888; }
</style>
</head>
<body>
  <div class="wrap">
    <div class="head">
      <div class="brand">BOLDER<small>MARKETING</small></div>
      <div class="meta">${escapeHtml(client.name)}<br/>${label} · ${cycle}</div>
    </div>
    ${body}
    <div class="foot">Prepared by BOLDER Marketing. Questions? Just reply to this report.</div>
  </div>
</body>
</html>`;
}

function escapeHtml(s = '') {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
