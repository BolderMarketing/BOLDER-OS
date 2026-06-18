// Shared enums + labels mirrored from the backend / skill file.

export const STAGES = [
  { key: 'not_started', label: 'Not Started' },
  { key: 'research', label: 'Research & Plan' },
  { key: 'building', label: 'Building' },
  { key: 'review', label: 'Review / Approval' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'done', label: 'Done' },
];

export const STAGE_LABEL = Object.fromEntries(STAGES.map((s) => [s.key, s.label]));
export const STAGE_ORDER = STAGES.map((s) => s.key);

export const PRIORITIES = [
  { key: 'critical', label: 'Critical' },
  { key: 'high', label: 'High' },
  { key: 'normal', label: 'Normal' },
  { key: 'low', label: 'Low' },
];
export const PRIORITY_LABEL = Object.fromEntries(PRIORITIES.map((p) => [p.key, p.label]));

export const SERVICES = [
  { key: 'seo', label: 'SEO' },
  { key: 'geo', label: 'GEO' },
  { key: 'web', label: 'Web' },
  { key: 'content', label: 'Content' },
  { key: 'report', label: 'Report' },
  { key: 'reddit', label: 'Reddit' },
  { key: 'other', label: 'Other' },
];
export const SERVICE_LABEL = Object.fromEntries(SERVICES.map((s) => [s.key, s.label]));

export const TIERS = [
  { key: 'starter', label: 'Starter', rate: 1000 },
  { key: 'momentum', label: 'Momentum', rate: 2000 },
  { key: 'authority', label: 'Authority', rate: 3500 },
];
export const TIER_LABEL = Object.fromEntries(TIERS.map((t) => [t.key, t.label]));

// Next stage in the pipeline (for click-to-advance).
export function nextStage(stage) {
  const i = STAGE_ORDER.indexOf(stage);
  if (i < 0 || i === STAGE_ORDER.length - 1) return stage;
  return STAGE_ORDER[i + 1];
}

export function isOverdue(task) {
  if (!task.due_date || task.stage === 'done') return false;
  return task.due_date < new Date().toISOString().slice(0, 10);
}

export const todayCycle = () => new Date().toISOString().slice(0, 7);
