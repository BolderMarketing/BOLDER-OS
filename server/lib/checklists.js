// Monthly repeating task checklists per tier.
// Source of truth: pm-workflow.md "MONTHLY REPEATING TASK CHECKLISTS".
// Each item: { title, service_type, stage, priority, dueDay? }
// stage/priority taken from the skill's italic annotations.
// service_type inferred from the task's nature (seo/geo/web/content/report/reddit/other).

const STARTER = [
  { title: 'Google Business Profile content update', service_type: 'seo', stage: 'building', priority: 'normal' },
  { title: 'On-page SEO check (meta, headings, schema)', service_type: 'seo', stage: 'building', priority: 'normal' },
  { title: 'Basic AI search visibility check', service_type: 'geo', stage: 'research', priority: 'normal' },
  { title: 'Monthly performance report draft', service_type: 'report', stage: 'building', priority: 'critical', dueDay: 28 },
  { title: 'Report reviewed by Faris', service_type: 'report', stage: 'review', priority: 'critical' },
  { title: 'Report sent to client', service_type: 'report', stage: 'submitted', priority: 'critical' },
];

const MOMENTUM = [
  { title: 'Keyword ranking pull (15–20 keywords)', service_type: 'seo', stage: 'research', priority: 'high' },
  { title: 'Technical SEO check (crawl errors, meta, schema, 404s)', service_type: 'seo', stage: 'building', priority: 'normal' },
  { title: 'Google Business Profile optimization update', service_type: 'seo', stage: 'building', priority: 'normal' },
  { title: 'GEO citation check: ChatGPT, Claude, Perplexity', service_type: 'geo', stage: 'research', priority: 'high' },
  { title: 'Reddit strategy post + tracking update', service_type: 'reddit', stage: 'building', priority: 'normal' },
  { title: '4 content pieces brief + production', service_type: 'content', stage: 'building', priority: 'high' },
  { title: 'Link building outreach', service_type: 'seo', stage: 'building', priority: 'normal' },
  { title: 'Strategy call prep', service_type: 'other', stage: 'review', priority: 'high' },
  { title: 'Monthly performance report draft', service_type: 'report', stage: 'building', priority: 'critical', dueDay: 25 },
  { title: 'Report reviewed by Faris', service_type: 'report', stage: 'review', priority: 'critical' },
  { title: 'Report sent to client', service_type: 'report', stage: 'submitted', priority: 'critical' },
];

// AUTHORITY "adds to MOMENTUM" per the skill file.
const AUTHORITY_ADDS = [
  { title: 'Expanded keyword tracking (30+ keywords)', service_type: 'seo', stage: 'research', priority: 'high' },
  { title: 'Full Reddit campaign execution', service_type: 'reddit', stage: 'building', priority: 'high' },
  { title: 'Broad GEO citation building', service_type: 'geo', stage: 'building', priority: 'high' },
  { title: 'AI-mention monitoring report', service_type: 'geo', stage: 'research', priority: 'high' },
  { title: 'Reputation Engine: review request send + response drafts', service_type: 'other', stage: 'building', priority: 'normal' },
  { title: '6–8 content pieces brief + production', service_type: 'content', stage: 'building', priority: 'high' },
  { title: 'Aggressive link building outreach', service_type: 'seo', stage: 'building', priority: 'high' },
  { title: 'Website performance + conversion audit', service_type: 'web', stage: 'research', priority: 'normal' },
  { title: 'Bi-weekly check-in #1 prep', service_type: 'other', stage: 'review', priority: 'normal' },
  { title: 'Bi-weekly check-in #2 prep', service_type: 'other', stage: 'review', priority: 'normal' },
  { title: 'Bi-weekly report #1', service_type: 'report', stage: 'building', priority: 'high', dueDay: 14 },
  { title: 'Bi-weekly report #2', service_type: 'report', stage: 'building', priority: 'critical', dueDay: 28 },
  { title: 'Both reports reviewed by Faris', service_type: 'report', stage: 'review', priority: 'critical' },
  { title: 'Reports sent to client', service_type: 'report', stage: 'submitted', priority: 'critical' },
  { title: 'Quarterly strategy session prep (if applicable)', service_type: 'other', stage: 'building', priority: 'high' },
];

export const CHECKLISTS = {
  starter: STARTER,
  momentum: MOMENTUM,
  authority: [...MOMENTUM, ...AUTHORITY_ADDS],
};

// Reporting windows (skill: 25th for Momentum/Starter, 10th & 25th for Authority).
export function reportingWindow(tier) {
  return tier === 'authority' ? [10, 25] : [25];
}

export function checklistForTier(tier) {
  return CHECKLISTS[tier] || [];
}
