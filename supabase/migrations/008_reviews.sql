-- Migration 008 — reviews

create table if not exists public.reviews (
  id uuid default gen_random_uuid() primary key,
  job_id uuid references public.jobs(id) unique not null,
  customer_id uuid references public.profiles(id) not null,
  rating integer check (rating between 1 and 5) not null,
  body text,
  photo_consent boolean default false,
  created_at timestamptz default now()
);

alter table public.reviews enable row level security;
create policy "Customers manage own reviews" on public.reviews for all using (auth.uid() = customer_id);
create policy "Admins see all" on public.reviews for all using (public.is_admin());
