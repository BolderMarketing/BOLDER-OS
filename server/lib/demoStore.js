// In-memory demo backend. Lets the entire OS run with NO Supabase, NO API keys —
// so you can see and edit the UI instantly via `npm run dev`.
// Enabled when DEMO_MODE=true OR when Supabase isn't configured.
// It mimics the small slice of the Supabase JS query builder the routes use.
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { checklistForTier } from './checklists.js';
import { monthCycle, dateInCycle, iso } from './dates.js';

// ---- table defaults applied on insert (mirror the SQL defaults) ----
const DEFAULTS = {
  clients: () => ({ status: 'active', tier: null }),
  deliverables: () => ({
    service_type: 'other', stage: 'not_started', priority: 'normal',
    is_recurring: false, completed_at: null, due_date: null, notes: null,
  }),
  reports: () => ({ status: 'draft', report_type: 'monthly', approved_at: null, sent_at: null }),
  projects: () => ({ stage: 'not_started', description: null, due_date: null }),
  approval_queue: () => ({ status: 'pending', rejection_reason: null, resolved_at: null }),
  ace_feedback: () => ({}),
  users: () => ({ role: 'admin', portal_client_id: null }),
};

// ---- the store ----
const db = { users: [], clients: [], deliverables: [], reports: [], projects: [], approval_queue: [], ace_feedback: [] };

function stamp(table, row) {
  const base = DEFAULTS[table] ? DEFAULTS[table]() : {};
  return {
    id: randomUUID(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...base,
    ...row,
  };
}

// Attach an embedded `clients` object when the select asks for clients(...).
function withJoin(rows, selectStr) {
  if (!selectStr || !/clients\s*\(/.test(selectStr)) return rows;
  return rows.map((r) => {
    const c = db.clients.find((x) => x.id === r.client_id);
    return { ...r, clients: c ? { name: c.name, tier: c.tier } : null };
  });
}

class Query {
  constructor(table) {
    this.table = table;
    this.op = 'select';
    this.selectStr = '*';
    this.opts = {};
    this.payload = null;
    this.filters = [];
    this.orders = [];
    this.limitN = null;
    this.mode = null; // 'single' | 'maybeSingle'
  }
  select(str = '*', opts = {}) {
    this.selectStr = str;
    this.opts = opts;
    if (this.op !== 'select') this._afterWrite = true; // .select() after insert/update returns rows
    return this;
  }
  insert(payload) { this.op = 'insert'; this.payload = payload; return this; }
  update(payload) { this.op = 'update'; this.payload = payload; return this; }
  delete() { this.op = 'delete'; return this; }
  eq(col, val) { this.filters.push({ t: 'eq', col, val }); return this; }
  neq(col, val) { this.filters.push({ t: 'neq', col, val }); return this; }
  in(col, vals) { this.filters.push({ t: 'in', col, vals }); return this; }
  ilike(col, pattern) { this.filters.push({ t: 'ilike', col, pattern }); return this; }
  gte(col, val) { this.filters.push({ t: 'gte', col, val }); return this; }
  lte(col, val) { this.filters.push({ t: 'lte', col, val }); return this; }
  order(col, o = {}) { this.orders.push({ col, ascending: o.ascending !== false, nullsFirst: !!o.nullsFirst }); return this; }
  limit(n) { this.limitN = n; return this; }
  single() { this.mode = 'single'; return this; }
  maybeSingle() { this.mode = 'maybeSingle'; return this; }

  _match(row) {
    return this.filters.every((f) => {
      const v = row[f.col];
      switch (f.t) {
        case 'eq': return v === f.val;
        case 'neq': return v !== f.val;
        case 'in': return f.vals.includes(v);
        case 'gte': return v != null && v >= f.val;
        case 'lte': return v != null && v <= f.val;
        case 'ilike': {
          const needle = String(f.pattern).replace(/%/g, '').toLowerCase();
          return String(v ?? '').toLowerCase().includes(needle);
        }
        default: return true;
      }
    });
  }

  _run() {
    const table = db[this.table] || (db[this.table] = []);

    // writes
    if (this.op === 'insert') {
      const arr = Array.isArray(this.payload) ? this.payload : [this.payload];
      const inserted = arr.map((r) => stamp(this.table, r));
      table.push(...inserted);
      return this._shape(inserted);
    }
    if (this.op === 'update') {
      const matched = table.filter((r) => this._match(r));
      matched.forEach((r) => Object.assign(r, this.payload, { updated_at: new Date().toISOString() }));
      return this._shape(matched);
    }
    if (this.op === 'delete') {
      for (let i = table.length - 1; i >= 0; i--) if (this._match(table[i])) table.splice(i, 1);
      return { data: null, error: null };
    }

    // select
    let rows = table.filter((r) => this._match(r));
    for (const o of [...this.orders].reverse()) {
      rows.sort((a, b) => {
        const av = a[o.col], bv = b[o.col];
        if (av == null && bv == null) return 0;
        if (av == null) return o.nullsFirst ? -1 : 1;
        if (bv == null) return o.nullsFirst ? 1 : -1;
        return (av < bv ? -1 : av > bv ? 1 : 0) * (o.ascending ? 1 : -1);
      });
    }
    if (this.limitN != null) rows = rows.slice(0, this.limitN);
    if (this.opts.head) return { data: null, count: table.filter((r) => this._match(r)).length, error: null };
    rows = withJoin(rows, this.selectStr);
    return this._shape(rows);
  }

  _shape(rows) {
    if (this.mode === 'single') {
      return rows.length ? { data: rows[0], error: null } : { data: null, error: { message: 'No rows' } };
    }
    if (this.mode === 'maybeSingle') {
      return { data: rows[0] || null, error: null };
    }
    // post-write with no .select() -> data null (matches supabase)
    if ((this.op === 'insert' || this.op === 'update') && !this._afterWrite) {
      return { data: null, error: null };
    }
    return { data: rows, error: null };
  }

  then(onF, onR) {
    try {
      return Promise.resolve(this._run()).then(onF, onR);
    } catch (e) {
      return Promise.resolve({ data: null, error: { message: e.message } }).then(onF, onR);
    }
  }
}

export const demoClient = {
  from(table) {
    return new Query(table);
  },
};

// ---- seed realistic sample data so every view is populated ----
let seeded = false;
export function seedDemo() {
  if (seeded) return;
  seeded = true;

  db.users.push(stamp('users', {
    email: 'faris@bolder.biz',
    password_hash: bcrypt.hashSync('bolder', 10),
    role: 'admin',
  }));

  const big = stamp('clients', {
    name: 'Body In Gear', industry: 'Physical therapy clinic, Palatine IL',
    contact_name: 'Zach', tier: 'momentum', monthly_rate: 2000, status: 'active',
    notes: 'Email marketing, Google reviews, PT treatment plans.',
  });
  const owaynat = stamp('clients', {
    name: 'Owaynat Law Group', industry: 'Law firm, Chicago IL',
    tier: 'authority', monthly_rate: 3500, status: 'active',
    notes: 'Courtroom presentations, website build in progress.',
  });
  db.clients.push(big, owaynat);

  const cycle = monthCycle();
  const stages = ['not_started', 'research', 'building', 'review', 'submitted'];
  // Generate each client's tier checklist, then vary stages/dates for a lively board.
  [big, owaynat].forEach((client) => {
    checklistForTier(client.tier).forEach((t, i) => {
      const stage = t.stage && i % 3 === 0 ? t.stage : stages[i % stages.length];
      db.deliverables.push(stamp('deliverables', {
        client_id: client.id, title: t.title, service_type: t.service_type,
        stage, priority: t.priority, month_cycle: cycle,
        due_date: dateInCycle(cycle, t.dueDay), is_recurring: true,
      }));
    });
  });

  // A couple of overdue + critical items so Today's Focus has teeth.
  const past = iso(new Date(Date.now() - 3 * 86400000));
  db.deliverables.push(
    stamp('deliverables', {
      client_id: big.id, title: 'Body In Gear — June report draft', service_type: 'report',
      stage: 'building', priority: 'critical', month_cycle: cycle, due_date: past, is_recurring: false,
    }),
    stamp('deliverables', {
      client_id: owaynat.id, title: 'Owaynat keyword pull (30+)', service_type: 'seo',
      stage: 'review', priority: 'high', month_cycle: cycle, due_date: past, is_recurring: false,
    }),
  );

  db.projects.push(stamp('projects', {
    client_id: owaynat.id, name: 'New website build (10 pages)',
    description: 'Full custom site + intake quiz. Live in 7 days.',
    stage: 'building', due_date: dateInCycle(cycle, 20),
  }));

  // One pending approval so the bell shows a badge.
  const critTask = db.deliverables.find((d) => d.priority === 'critical');
  db.approval_queue.push(stamp('approval_queue', {
    type: 'task_complete', reference_id: critTask?.id,
    payload: { title: critTask?.title, client_id: critTask?.client_id }, status: 'pending',
  }));
}
