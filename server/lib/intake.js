// SMS / voice command parsing -> task actions. Returns a confirmation string
// to text back to Faris. Commands (case-insensitive):
//   add task [client] [description]
//   done [task description]
//   urgent [task description]
//   status
import { supabase, unwrap } from './supabase.js';
import { monthCycle } from './dates.js';

export async function parseAndExecute(rawText) {
  const text = (rawText || '').trim();
  if (!text) return "Didn't catch that. Try: add task / done / urgent / status";

  const lower = text.toLowerCase();

  if (lower === 'status' || lower.startsWith('status')) return await statusReply();
  if (lower.startsWith('add task')) return await addTask(text.slice('add task'.length).trim());
  if (lower.startsWith('add ')) return await addTask(text.slice(4).trim());
  if (lower.startsWith('done')) return await markDone(text.slice(4).trim());
  if (lower.startsWith('urgent')) return await markUrgent(text.slice(6).trim());

  return "Didn't recognize that. Commands: add task [client] [desc], done [desc], urgent [desc], status";
}

async function findClientByName(fragment) {
  if (!fragment) return null;
  const clients = unwrap(await supabase().from('clients').select('id, name'));
  const f = fragment.toLowerCase();
  // Prefer the longest client name that appears at the start of the fragment.
  let best = null;
  for (const c of clients) {
    if (f.startsWith(c.name.toLowerCase())) {
      if (!best || c.name.length > best.name.length) best = c;
    }
  }
  if (best) return best;
  // Fallback: any client name contained in the fragment.
  return clients.find((c) => f.includes(c.name.toLowerCase())) || null;
}

async function addTask(rest) {
  if (!rest) return 'Add what? Format: add task [client] [description]';
  const client = await findClientByName(rest);
  let title = rest;
  let client_id = null;
  if (client) {
    client_id = client.id;
    title = rest.slice(client.name.length).trim() || rest;
  }
  if (!title) return 'Need a task description.';

  unwrap(
    await supabase().from('deliverables').insert({
      client_id,
      title,
      service_type: 'other',
      stage: 'not_started',
      priority: 'normal',
      month_cycle: monthCycle(),
    })
  );
  return client
    ? `Added for ${client.name}: "${title}". Not Started / Normal.`
    : `Added: "${title}" (no client matched). Not Started / Normal.`;
}

async function findTaskByTitle(fragment) {
  if (!fragment) return null;
  const matches = unwrap(
    await supabase()
      .from('deliverables')
      .select('id, title, stage, clients(name)')
      .ilike('title', `%${fragment}%`)
      .neq('stage', 'done')
      .limit(2)
  );
  return matches;
}

async function markDone(rest) {
  if (!rest) return 'Done with what? Format: done [task description]';
  const matches = await findTaskByTitle(rest);
  if (!matches.length) return `No open task matching "${rest}".`;
  if (matches.length > 1) return `Multiple tasks match "${rest}". Be more specific.`;
  const t = matches[0];
  unwrap(await supabase().from('deliverables').update({ stage: 'review' }).eq('id', t.id));
  return `Moved "${t.title}" to Review.`;
}

async function markUrgent(rest) {
  if (!rest) return 'Mark what urgent? Format: urgent [task description]';
  const matches = await findTaskByTitle(rest);
  if (!matches.length) return `No open task matching "${rest}".`;
  if (matches.length > 1) return `Multiple tasks match "${rest}". Be more specific.`;
  const t = matches[0];
  unwrap(await supabase().from('deliverables').update({ priority: 'critical' }).eq('id', t.id));
  return `"${t.title}" set to Critical.`;
}

async function statusReply() {
  const cycle = monthCycle();
  const tasks = unwrap(
    await supabase()
      .from('deliverables')
      .select('title, priority, stage, clients(name)')
      .eq('month_cycle', cycle)
      .in('priority', ['critical', 'high'])
      .neq('stage', 'done')
  );
  if (!tasks.length) return 'Nothing critical or high open right now. Clear.';
  const crit = tasks.filter((t) => t.priority === 'critical');
  const high = tasks.filter((t) => t.priority === 'high');
  const fmt = (t) => `${t.clients?.name ? t.clients.name + ': ' : ''}${t.title}`;
  let out = '';
  if (crit.length) out += `CRITICAL (${crit.length}):\n${crit.map(fmt).join('\n')}\n`;
  if (high.length) out += `HIGH (${high.length}):\n${high.map(fmt).join('\n')}`;
  return out.trim();
}
