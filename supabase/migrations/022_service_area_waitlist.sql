-- Migration 022 — Service area (ZIPs we book online) + waitlist for everyone else.
-- No rows in service_zips = every ZIP is bookable.

create table if not exists public.service_zips (
  zip text primary key check (zip ~ '^[0-9]{5}$'),
  label text,
  created_at timestamptz not null default now()
);
alter table public.service_zips enable row level security;
drop policy if exists "service_zips admin all" on public.service_zips;
create policy "service_zips admin all" on public.service_zips
  for all using (public.is_admin()) with check (public.is_admin());

insert into public.service_zips (zip, label) values
  ('73019', 'Norman (OU)'), ('73026', 'Norman (east)'), ('73069', 'Norman'),
  ('73070', 'Norman'), ('73071', 'Norman'), ('73072', 'Norman (west)')
on conflict (zip) do nothing;

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  zip text not null check (zip ~ '^[0-9]{5}$'),
  name text,
  email text not null,
  phone text,
  address text,
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (email, zip)
);
alter table public.waitlist enable row level security;
drop policy if exists "waitlist admin all" on public.waitlist;
create policy "waitlist admin all" on public.waitlist
  for all using (public.is_admin()) with check (public.is_admin());
create index if not exists waitlist_zip_idx on public.waitlist (zip);
