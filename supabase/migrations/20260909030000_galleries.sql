-- Admin gallery workflow: galleries + gallery-to-photo associations.
-- A gallery belongs to one event; photos must belong to the same event.

create table public.galleries (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.events (id) on delete cascade,
  name         text not null,
  description  text not null default '',
  slug         text not null unique,
  pin          text not null,               -- 6-digit numeric, server-generated
  status       text not null default 'draft'
               check (status in ('draft', 'published')),
  published_at timestamptz,
  created_by   uuid not null references public.users (id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index idx_galleries_event on public.galleries (event_id);
create index idx_galleries_slug on public.galleries (slug);

create trigger trg_galleries_updated_at
  before update on public.galleries
  for each row execute function public.set_updated_at();

-- Join table: which selected photos belong to a gallery.
create table public.gallery_photos (
  gallery_id uuid not null references public.galleries (id) on delete cascade,
  photo_id   uuid not null references public.photos (id) on delete cascade,
  added_at   timestamptz not null default now(),
  primary key (gallery_id, photo_id)
);

create index idx_gallery_photos_photo on public.gallery_photos (photo_id);

alter table public.galleries enable row level security;
alter table public.gallery_photos enable row level security;
