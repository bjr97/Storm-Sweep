-- Migration 004 — job_photos

create table if not exists public.job_photos (
  id uuid default gen_random_uuid() primary key,
  job_id uuid references public.jobs(id) on delete cascade not null,
  photo_type text check (photo_type in ('before','after','upgrade','signature','booking_screen')) not null,
  storage_path text not null,
  uploaded_by uuid references public.profiles(id),
  customer_consent boolean default false,
  created_at timestamptz default now()
);

create index if not exists job_photos_job_id_idx on public.job_photos (job_id);

alter table public.job_photos enable row level security;
create policy "Customers see own job photos" on public.job_photos for select using (
  exists (select 1 from public.jobs where id = job_id and customer_id = auth.uid())
);
create policy "Sweepers see assigned job photos" on public.job_photos for select using (
  exists (select 1 from public.jobs where id = job_id and sweeper_id = auth.uid())
);
create policy "Admins see all" on public.job_photos for all using (public.is_admin());
