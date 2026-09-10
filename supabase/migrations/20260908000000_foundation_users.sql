-- FrameFlow application schema (foundation phase)
-- Users are provisioned just-in-time from verified Clerk identities.
-- Roles: application-level ADMIN / TEAM_MEMBER, stored here — never in Clerk.

create type public.user_role as enum ('ADMIN', 'TEAM_MEMBER');

create table public.users (
  id            uuid primary key default gen_random_uuid(),
  clerk_user_id text not null unique,
  name          text not null default '',
  email         text not null,
  role          public.user_role not null default 'TEAM_MEMBER',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_users_email on public.users (email);

-- Keep updated_at fresh on every row update.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_users_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- RLS: the backend connects with the service role (bypasses RLS). No anon/auth
-- policies are exposed — direct client access to this table is denied.
alter table public.users enable row level security;
