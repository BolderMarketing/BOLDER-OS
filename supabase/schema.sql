-- =====================================================================
-- BOLDER OS — Phase 1 Schema (Supabase / Postgres)
-- Run this in the Supabase SQL editor.
-- Row Level Security is enabled on every table.
-- The backend connects with the SERVICE ROLE key (bypasses RLS) and is
-- the real auth gate (JWT middleware on every Express route). RLS is the
-- second line of defence and isolates the future client portal role.
-- =====================================================================

-- Required for gen_random_uuid()
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------
-- USERS (just Faris for now)
-- ---------------------------------------------------------------------
create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  email         text unique not null,
  password_hash text not null,
  role          text not null default 'admin' check (role in ('admin', 'portal')),
  -- portal users are scoped to a single client
  portal_client_id uuid,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- CLIENTS
-- ---------------------------------------------------------------------
create table if not exists clients (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  industry            text,
  contact_name        text,
  contact_email       text,
  contact_phone       text,
  tier                text check (tier in ('starter', 'momentum', 'authority')),
  monthly_rate        numeric,
  start_date          date,
  commitment_end_date date,
  status              text not null default 'active' check (status in ('active', 'paused', 'churned')),
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger clients_updated_at before update on clients
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- DELIVERABLES (tasks)
-- ---------------------------------------------------------------------
create table if not exists deliverables (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid references clients(id) on delete cascade,
  title         text not null,
  service_type  text not null default 'other'
                  check (service_type in ('seo','geo','web','content','report','reddit','other')),
  stage         text not null default 'not_started'
                  check (stage in ('not_started','research','building','review','submitted','done')),
  priority      text not null default 'normal'
                  check (priority in ('critical','high','normal','low')),
  due_date      date,
  completed_at  timestamptz,
  month_cycle   text,              -- '2026-06' format
  is_recurring  boolean not null default false,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_deliverables_client  on deliverables(client_id);
create index if not exists idx_deliverables_cycle   on deliverables(month_cycle);
create index if not exists idx_deliverables_stage   on deliverables(stage);

create trigger deliverables_updated_at before update on deliverables
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- REPORTS
-- ---------------------------------------------------------------------
create table if not exists reports (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid references clients(id) on delete cascade,
  month_cycle   text not null,
  report_type   text not null default 'monthly' check (report_type in ('monthly','biweekly')),
  status        text not null default 'draft'
                  check (status in ('draft','pending_approval','approved','sent')),
  html_content  text,
  approved_at   timestamptz,
  sent_at       timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_reports_client on reports(client_id);

create trigger reports_updated_at before update on reports
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- PROJECTS (one-off, non-retainer)
-- ---------------------------------------------------------------------
create table if not exists projects (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid references clients(id) on delete cascade,
  name         text not null,
  description  text,
  stage        text not null default 'not_started'
                 check (stage in ('not_started','research','building','review','submitted','done')),
  due_date     date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger projects_updated_at before update on projects
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- ACE APPROVAL QUEUE
-- ---------------------------------------------------------------------
create table if not exists approval_queue (
  id               uuid primary key default gen_random_uuid(),
  type             text not null check (type in ('report','email','task_complete','portal_update')),
  reference_id     uuid,
  payload          jsonb,
  status           text not null default 'pending' check (status in ('pending','approved','rejected')),
  rejection_reason text,
  created_at       timestamptz not null default now(),
  resolved_at      timestamptz
);

create index if not exists idx_approval_status on approval_queue(status);

-- ---------------------------------------------------------------------
-- ACE LEARNING LOG
-- ---------------------------------------------------------------------
create table if not exists ace_feedback (
  id               uuid primary key default gen_random_uuid(),
  output_type      text,
  rejection_reason text,
  raw_output       text,
  revised_output   text,
  created_at       timestamptz not null default now()
);

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
alter table users          enable row level security;
alter table clients        enable row level security;
alter table deliverables   enable row level security;
alter table reports        enable row level security;
alter table projects       enable row level security;
alter table approval_queue enable row level security;
alter table ace_feedback   enable row level security;

-- The backend uses the service_role key, which BYPASSES RLS entirely.
-- These policies therefore govern any direct (anon/authenticated) access,
-- and lock everything down by default. No anon policy = no anon access.

-- Admin (Faris) full access when using a Supabase JWT with role 'admin'.
-- (Phase 1 the app does not use Supabase Auth directly — kept for future.)
do $$
declare t text;
begin
  foreach t in array array['clients','deliverables','reports','projects','approval_queue','ace_feedback']
  loop
    execute format(
      'create policy %I on %I for all to authenticated using (true) with check (true);',
      t || '_admin_all', t
    );
  end loop;
end $$;

-- Client portal isolation (future): a portal user may only READ their own
-- client record and that client's reports. Everything else stays invisible.
-- Portal sessions are expected to carry a JWT claim "portal_client_id".
create policy clients_portal_read on clients
  for select to authenticated
  using (
    coalesce((auth.jwt() ->> 'portal_client_id')::uuid, '00000000-0000-0000-0000-000000000000') = id
  );

create policy reports_portal_read on reports
  for select to authenticated
  using (
    coalesce((auth.jwt() ->> 'portal_client_id')::uuid, '00000000-0000-0000-0000-000000000000') = client_id
    and status in ('approved','sent')
  );
