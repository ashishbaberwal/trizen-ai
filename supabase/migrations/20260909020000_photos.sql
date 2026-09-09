-- Phase 3: photo metadata. Binaries live in Appwrite; this table stores
-- metadata only. Workspace isolation resolves through photo → event.

create table public.photos (
  id             uuid primary key default gen_random_uuid(),
  event_id       uuid not null references public.events (id) on delete cascade,
  uploaded_by    uuid not null references public.users (id),
  filename       text not null,                -- original filename (metadata only)
  storage_file_id text not null,               -- Appwrite file ID (safe UUID)
  storage_provider text not null default 'appwrite',
  mime_type      text not null,
  file_size      integer not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index idx_photos_event on public.photos (event_id, created_at desc);
create index idx_photos_uploaded_by on public.photos (uploaded_by);

-- One metadata row cannot point at the same Appwrite file twice.
create unique index idx_photos_storage_file on public.photos (storage_file_id);

create trigger trg_photos_updated_at
  before update on public.photos
  for each row execute function public.set_updated_at();

alter table public.photos enable row level security;
