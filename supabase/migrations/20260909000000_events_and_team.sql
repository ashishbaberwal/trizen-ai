-- Phase 2: events and event/team membership relationships.
-- Additive only — the existing users table is untouched.

create table public.events (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text not null default '',
  location    text not null default '',
  event_date  date not null,
  status      text not null default 'draft'
              check (status in ('draft', 'active', 'completed')),
  created_by  uuid not null references public.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_events_created_by on public.events (created_by);

-- Relationship-based event access. A user (TEAM_MEMBER or ADMIN) is linked
-- to an event through this table; access is never global.
create table public.event_team_members (
  event_id   uuid not null references public.events (id) on delete cascade,
  user_id    uuid not null references public.users (id) on delete cascade,
  added_by   uuid references public.users (id) on delete set null,
  added_at   timestamptz not null default now(),
  primary key (event_id, user_id)
);

create index idx_etm_user on public.event_team_members (user_id);

-- Reuse the existing updated_at trigger.
create trigger trg_events_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

-- RLS: backend connects with a privileged role; no anon/auth policies exposed.
alter table public.events enable row level security;
alter table public.event_team_members enable row level security;
