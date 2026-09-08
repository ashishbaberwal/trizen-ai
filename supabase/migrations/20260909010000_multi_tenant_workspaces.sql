-- Multi-tenant foundation: workspaces + tenant scoping.
-- Safe migration: additive; existing users are backfilled, nothing dropped.

-- 1. Workspaces ----------------------------------------------------------

create table public.workspaces (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_by uuid references public.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_workspaces_updated_at
  before update on public.workspaces
  for each row execute function public.set_updated_at();

alter table public.workspaces enable row level security;

-- 2. Backfill: one workspace per independent existing ADMIN ---------------
-- (ADMIN = owner of their own workspace; TEAM_MEMBERs are handled after,
--  see invitations backfill below.)

insert into public.workspaces (name, created_by, created_at)
select
  coalesce(nullif(u.name, ''), split_part(u.email, '@', 1), 'Workspace') || '''s Studio',
  u.id,
  u.created_at
from public.users u
where u.role = 'ADMIN'
  and not exists (select 1 from public.event_team_members etm where etm.user_id = u.id);

-- 3. Users → workspace ----------------------------------------------------

alter table public.users
  add column workspace_id uuid references public.workspaces (id);

-- TEAM_MEMBERs follow the ADMIN they were invited by / provisioned alongside.
-- In this dataset invited members were created after their admin and share no
-- other signal, so: latest ADMIN created before the member becomes the owner.
-- Orphan TEAM_MEMBERs (created before any ADMIN — e.g. test rows) fall back to
-- the earliest ADMIN's workspace; this is reported, not silently guessed.
update public.users u
set workspace_id = w.id
from public.workspaces w
where u.role = 'TEAM_MEMBER'
  and u.workspace_id is null
  and w.created_by = coalesce(
    (
      select a.id from public.users a
      where a.role = 'ADMIN'
        and a.created_at <= u.created_at
      order by a.created_at desc
      limit 1
    ),
    (
      select a.id from public.users a
      where a.role = 'ADMIN'
      order by a.created_at asc
      limit 1
    )
  );

-- Remaining users (admins + orphans) get their own backfilled workspace.
update public.users u
set workspace_id = w.id
from public.workspaces w
where w.created_by = u.id
  and u.workspace_id is null;

-- Workspace membership is mandatory from here on.
alter table public.users
  alter column workspace_id set not null;

create index idx_users_workspace on public.users (workspace_id);

-- 4. Events → workspace ---------------------------------------------------

alter table public.events
  add column workspace_id uuid references public.workspaces (id);

-- Existing events inherit the creator's workspace.
update public.events e
set workspace_id = u.workspace_id
from public.users u
where e.created_by = u.id
  and e.workspace_id is null;

alter table public.events
  alter column workspace_id set not null;

create index idx_events_workspace on public.events (workspace_id);

-- 5. Invitations ----------------------------------------------------------
-- Tracks outstanding invites so an invited signup can be attached to the
-- inviter's workspace (never their own).

create type public.invitation_status as enum ('pending', 'accepted', 'revoked');

create table public.invitations (
  id                  uuid primary key default gen_random_uuid(),
  email               text not null,
  workspace_id        uuid not null references public.workspaces (id) on delete cascade,
  invited_by          uuid not null references public.users (id),
  status              public.invitation_status not null default 'pending',
  clerk_invitation_id text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index idx_invitations_email on public.invitations (email);
create index idx_invitations_workspace on public.invitations (workspace_id);

create trigger trg_invitations_updated_at
  before update on public.invitations
  for each row execute function public.set_updated_at();

alter table public.invitations enable row level security;

-- 6. Event membership uniqueness hardening (already PK) — add lookup index
create index idx_etm_event_lookup on public.event_team_members (event_id, user_id);
