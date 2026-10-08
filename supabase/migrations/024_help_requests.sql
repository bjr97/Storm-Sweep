-- Migration 024 — Customer "Need help?" requests. Stored so nothing is lost
-- even if texting/email isn't configured; the office also gets a text + email.

create table if not exists public.help_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id) on delete cascade,
  job_id uuid references public.jobs (id) on delete set null,
  topic text not null check (topic in ('visit', 'reschedule', 'billing', 'membership', 'other')),
  message text not null check (char_length(message) between 1 and 2000),
  handled_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.help_requests enable row level security;
drop policy if exists "help_requests admin all" on public.help_requests;
create policy "help_requests admin all" on public.help_requests
  for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "help_requests own read" on public.help_requests;
create policy "help_requests own read" on public.help_requests
  for select using (customer_id = auth.uid());
create index if not exists help_requests_open_idx on public.help_requests (created_at) where handled_at is null;
