-- Migration 013 — Sweeper job run (Phase 2.2): arrival, checklist evidence,
-- on-site upgrade sales, hazard pauses, videos, signature. Apply in 3 pieces.

-- ---- Piece 1: columns + photo types ----------------------------------------
alter table public.jobs
  add column if not exists en_route_at timestamptz,
  add column if not exists arrived_at timestamptz,
  add column if not exists arrival_lat double precision,
  add column if not exists arrival_lng double precision,
  add column if not exists arrival_accuracy_m integer,
  -- Distance from the geocoded service address; null if either side unknown.
  add column if not exists arrival_distance_m integer,
  -- true = GPS within range, false = outside range or location denied, null = couldn't check.
  add column if not exists arrival_verified boolean,
  add column if not exists customer_signature_name text;

alter table public.job_photos
  add column if not exists checklist_item text;

alter table public.job_photos drop constraint if exists job_photos_photo_type_check;
alter table public.job_photos add constraint job_photos_photo_type_check
  check (photo_type in ('before', 'after', 'upgrade', 'signature', 'booking_screen', 'inspection', 'issue', 'video_before', 'video_after'));

-- ---- Piece 2: issues + on-site upgrades ------------------------------------
create table if not exists public.job_issues (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  reported_by uuid references public.profiles(id),
  kind text not null check (kind in ('standing_water', 'structural', 'mold', 'pests', 'access', 'other')),
  note text,
  photo_path text,
  status text not null default 'open' check (status in ('open', 'continue', 'end_visit')),
  resolution_note text,
  resolved_by uuid references public.profiles(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists job_issues_open_idx on public.job_issues (job_id) where status = 'open';
alter table public.job_issues enable row level security;
drop policy if exists "Admins manage job issues" on public.job_issues;
create policy "Admins manage job issues" on public.job_issues for all using (public.is_admin());

create table if not exists public.job_upgrades (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  addon_id text not null,
  name text not null,
  -- integer cents: list price, member discount (<= 0), and what the customer pays.
  list_price integer not null,
  discount integer not null default 0,
  price integer not null,
  sold_by uuid references public.profiles(id),
  customer_initials text not null,
  approved_at timestamptz not null default now()
);
create index if not exists job_upgrades_job_idx on public.job_upgrades (job_id);
alter table public.job_upgrades enable row level security;
drop policy if exists "Admins manage job upgrades" on public.job_upgrades;
create policy "Admins manage job upgrades" on public.job_upgrades for all using (public.is_admin());

-- ---- Piece 3: storage privacy fix ------------------------------------------
-- 010 let ANY signed-in user read every job photo and write anywhere in the
-- bucket. Sweeper uploads now use short-lived signed upload URLs from the API,
-- and all reads use signed URLs, so these broad policies go.
drop policy if exists "Authenticated read job photos" on storage.objects;
drop policy if exists "Sweepers upload job photos" on storage.objects;
