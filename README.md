# BOLDER OS — Phase 1

Private internal operating system for **BOLDER Marketing**. Phase 1 ships the
**Project Manager terminal** + **ACE** (the in-OS AI assistant). Architected so
the other modules (CRM, Proposals, Personal Assistant, SEO/GEO & Web) drop in
later without rebuilding the foundation.

> Built to the spec in `pm-workflow.md` (the skill file). That file is the
> source of truth for tiers, checklists, stages, ACE voice, and security rules.

---

## Stack

- **Frontend:** React + Vite (`client/`)
- **Backend:** Node + Express, ES modules (`server/`)
- **Database:** Supabase (Postgres) — schema in `supabase/schema.sql`, RLS on every table
- **Auth:** JWT in an httpOnly cookie, verified on every protected route
- **AI:** Anthropic Claude (`claude-sonnet-4-6`) — server-side only
- **Transcription:** OpenAI Whisper (voice-memo intake)
- **SMS/Voice:** Twilio webhook (signature-verified)
- **Hosting:** Replit (single service serves the built client + API in prod)

---

## Setup

### 1. Database
Run `supabase/schema.sql` in the Supabase SQL editor. Creates all tables,
triggers, and RLS policies.

### 2. Environment
Copy `.env.example` → `.env` (local) or add each var as a Replit Secret.
Required to boot auth + DB: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `JWT_SECRET`.
The rest unlock ACE (`ANTHROPIC_API_KEY`), SMS (`TWILIO_*`, `FARIS_PHONE_NUMBER`,
`PUBLIC_URL`), and voice memos (`OPENAI_API_KEY`).

### 3. Install
```bash
npm run install:all
```

### 4. Bootstrap admin + seed clients
```bash
cd server
ADMIN_EMAIL=faris@bolder.biz ADMIN_PASSWORD='your-strong-password' node scripts/seed.js
```
Seeds Body In Gear and Owaynat Law Group (tier left unset — set it in the
**Clients** panel; tier drives monthly generation + reports).

### 5. Run
```bash
npm run dev      # server :3001 + client :5173 (Vite proxies /api)
```
Production (Replit): `npm run build && npm run start` — Express serves
`client/dist` and the API on one port.

---

## What's in Phase 1

**Project Manager terminal** (blue accent) — all 8 views:
Today's Focus · All Tasks · By Client · By Stage (kanban) · By Service ·
By Priority · Report Queue · One-off Projects.

**Task management** — create/edit modal, click-to-advance stage, priority color
coding, overdue red left-border. Marking a **Critical** task done routes through
the approval queue instead of completing silently.

**Monthly cycle auto-generation** — "Generate Month" builds each active client's
full tier checklist (from the skill file) for the current cycle. Idempotent.

**ACE** — bell/approval queue (report drafts, critical completions; reject reason
logged to `ace_feedback`) and an ask-ACE drawer (`/api/ace/ask`, grounded in
current state, slop-checked).

**Twilio intake** — `POST /api/webhooks/twilio` (signature-verified, Faris-only):
`add task [client] [desc]`, `done [desc]`, `urgent [desc]`, `status`. Voice memos
are transcribed via Whisper, then parsed. Every action is confirmed back by SMS.

**Reports** — ACE drafts branded HTML, stored in `reports`, previewed in-app,
queued for approval; approve → send (Phase 1 marks sent; real email is Phase 2).

---

## Security

JWT on every route (401 on miss). Anthropic/Supabase/Twilio keys are env-only.
Twilio webhook validates `X-Twilio-Signature` (the one unauthenticated route).
Supabase RLS on all tables. Rate limiting (100 req / 15 min / IP; 20 on auth).
CORS locked to `CLIENT_URL`. PII is summarized/stripped before any Claude prompt.

---

## Layout
```
client/   React app — components/{Shell,PM,ACE,Auth,ui}, hooks, utils
server/   Express API — routes/, middleware/, lib/, scripts/seed.js
supabase/ schema.sql (tables + RLS)
pm-workflow.md   skill file (source of truth)
```

## Notes
- The BOLDER logo renders as a type-based wordmark (`client/src/components/Logo.jsx`).
  To use the raster asset, drop it at `client/public/logo.png` and swap the component.
- ACE model is set via `ACE_MODEL` (default `claude-sonnet-4-6`).
