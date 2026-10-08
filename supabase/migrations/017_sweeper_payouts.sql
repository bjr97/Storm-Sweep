-- Migration 017 — Sweeper payouts (money actually sent to Sweepers, all cents).
-- Pay per job is calculated by the app; a payout covers a set of completed
-- jobs and snapshots each job's pay so history never changes later.

create table if not exists public.sweeper_payouts (
  id uuid primary key default gen_random_uuid(),
  sweeper_id uuid not null references public.profiles(id),
  amount integer not null check (amount >= 0),
  job_count integer not null,
  method text not null check (method in ('zelle', 'venmo', 'cash_app', 'check', 'cash', 'bank', 'other')),
  reference text,
  note text,
  paid_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists sweeper_payouts_sweeper_idx on public.sweeper_payouts (sweeper_id, paid_at desc);
alter table public.sweeper_payouts enable row level security;
drop policy if exists "Admins manage payouts" on public.sweeper_payouts;
create policy "Admins manage payouts" on public.sweeper_payouts for all using (public.is_admin());
drop policy if exists "Sweepers see own payouts" on public.sweeper_payouts;
create policy "Sweepers see own payouts" on public.sweeper_payouts for select using (auth.uid() = sweeper_id);

alter table public.jobs
  add column if not exists payout_id uuid references public.sweeper_payouts(id),
  -- Sweeper pay for this job as of the payout (cents).
  add column if not exists payout_amount integer;
