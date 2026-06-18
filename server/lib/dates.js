// Date helpers shared across monthly cycle generation, reporting windows, etc.

// '2026-06' for a given date (defaults to now).
export function monthCycle(date = new Date()) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

// Build an ISO date (YYYY-MM-DD) for a given day within a 'YYYY-MM' cycle.
export function dateInCycle(cycle, day) {
  if (!day) return null;
  const [y, m] = cycle.split('-');
  // Clamp day to the month's length.
  const last = new Date(Date.UTC(Number(y), Number(m), 0)).getUTCDate();
  const d = Math.min(day, last);
  return `${y}-${m}-${String(d).padStart(2, '0')}`;
}

// Start (Mon) and end (Sun) of the week containing `date`, as ISO dates.
export function weekBounds(date = new Date()) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay(); // 0 Sun .. 6 Sat
  const diffToMon = (day + 6) % 7;
  const start = new Date(d);
  start.setUTCDate(d.getUTCDate() - diffToMon);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  return { start: iso(start), end: iso(end) };
}

export function iso(d) {
  return d.toISOString().slice(0, 10);
}

export function todayIso() {
  return iso(new Date());
}
