// AI slop detection + rewrite. Runs on every ACE output before it reaches Faris.
// Source of truth: pm-workflow.md "AI SLOP PREVENTION".
import { anthropic, ACE_SYSTEM } from './anthropic.js';
import { env } from './env.js';

// Phrases ACE must never surface.
export const SLOP_PHRASES = [
  'Certainly!',
  'Absolutely!',
  'Great question!',
  "I'd be happy to",
  'I would be happy to',
  'Of course!',
  'As an AI',
  'Comprehensive',
  'Robust',
  'Leverage',
  'Utilize',
  'Delve',
  "It's worth noting",
  'It is worth noting',
  'In conclusion',
];

// Returns { flagged: boolean, hits: string[] }
export function detectSlop(text = '') {
  const lower = text.toLowerCase();
  const hits = SLOP_PHRASES.filter((p) => lower.includes(p.toLowerCase()));
  return { flagged: hits.length > 0, hits };
}

// If slop is detected, silently rewrite. Falls back to a local scrub if the
// model call fails so a draft is never blocked by slop.
export async function deslop(text = '') {
  const { flagged, hits } = detectSlop(text);
  if (!flagged) return { text, flagged: false, hits: [] };

  try {
    const client = anthropic();
    const msg = await client.messages.create({
      model: env.ACE_MODEL,
      max_tokens: 2000,
      system:
        ACE_SYSTEM +
        '\n\nYou are rewriting a draft to remove AI slop. Keep all real information ' +
        'and structure. Remove these banned phrases and the filler around them: ' +
        hits.join(', ') +
        '. Be direct, concise, no fluff. Return only the rewritten text, nothing else.',
      messages: [{ role: 'user', content: text }],
    });
    const rewritten = msg.content?.[0]?.text?.trim() || localScrub(text);
    return { text: rewritten, flagged: true, hits };
  } catch (e) {
    return { text: localScrub(text), flagged: true, hits, fallback: true };
  }
}

// Deterministic fallback: strip standalone slop openers / phrases.
function localScrub(text) {
  let out = text;
  for (const p of SLOP_PHRASES) {
    const re = new RegExp(`\\b${p.replace(/[.*+?^${}()|[\]\\!]/g, '\\$&')}\\b[,!.\\s]*`, 'gi');
    out = out.replace(re, '');
  }
  return out.replace(/\s{2,}/g, ' ').trim();
}
