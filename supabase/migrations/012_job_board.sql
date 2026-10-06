-- Migration 012 — Job board (Sweepers claim jobs), priority tiers, time windows
-- Function bodies use single quotes (not dollar quoting) so the SQL survives
-- copy/paste into the Supabase SQL editor.

-- ---- Jobs ------------------------------------------------------------------
alter table public.jobs
  -- Customer's preferred arrival window (booking Step 3).
  add column if not exists time_window text
    check (time_window in ('morning', 'midday', 'afternoon', 'evening', 'flexible')),
  -- When the job went up on the board (confirmed + unassigned). Tier drip and
  -- the speed-pay clock are measured from here. Reset if a Sweeper drops it.
  add column if not exists board_opened_at timestamptz,
  -- How the current Sweeper got the job.
  add column if not exists claimed_at timestamptz,
  add column if not exists assigned_via text check (assigned_via in ('claim', 'admin')),
  -- When the job became visible to the claiming Sweeper's tier (pay clock start).
  add column if not exists claim_visible_at timestamptz,
  add column if not exists claimed_tier text check (claimed_tier in ('gold', 'silver', 'standard'));

create index if not exists jobs_board_idx on public.jobs (board_opened_at)
  where sweeper_id is null and status = 'confirmed';

-- Put a job on the board whenever it is confirmed with no Sweeper — on insert,
-- on confirmation, or when a Sweeper drops it. Clear it once someone has it.
create or replace function public.jobs_board_open()
returns trigger
language plpgsql
as '
begin
  if new.status = ''confirmed'' and new.sweeper_id is null then
    if new.board_opened_at is null
       or (tg_op = ''UPDATE'' and old.sweeper_id is not null) then
      new.board_opened_at := now();
    end if;
    new.claimed_at := null;
    new.assigned_via := null;
    new.claim_visible_at := null;
    new.claimed_tier := null;
  end if;
  return new;
end;
';

drop trigger if exists jobs_board_open on public.jobs;
create trigger jobs_board_open
  before insert or update of status, sweeper_id on public.jobs
  for each row execute function public.jobs_board_open();

-- Backfill: confirmed, unassigned jobs that already exist go on the board now.
update public.jobs set board_opened_at = now()
where status = 'confirmed' and sweeper_id is null and board_opened_at is null;

-- ---- Claim history (drives the reliability part of the tier score) ---------
create table if not exists public.job_claim_events (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  sweeper_id uuid not null references public.profiles(id) on delete cascade,
  -- claim | drop (24h+ before) | late_drop (< 24h before) | admin_assign | admin_unassign
  event text not null check (event in ('claim', 'drop', 'late_drop', 'admin_assign', 'admin_unassign')),
  created_at timestamptz not null default now()
);
create index if not exists job_claim_events_sweeper_idx on public.job_claim_events (sweeper_id, created_at desc);

alter table public.job_claim_events enable row level security;
drop policy if exists "Admins manage claim events" on public.job_claim_events;
create policy "Admins manage claim events" on public.job_claim_events for all using (public.is_admin());
drop policy if exists "Sweepers see own claim events" on public.job_claim_events;
create policy "Sweepers see own claim events" on public.job_claim_events for select using (auth.uid() = sweeper_id);

-- ---- Sweeper tier override -------------------------------------------------
alter table public.profiles
  -- null = automatic tier from score; otherwise admin-pinned.
  add column if not exists sweeper_tier_override text
    check (sweeper_tier_override in ('gold', 'silver', 'standard'));

-- ---- Security fix ----------------------------------------------------------
-- 003 let Sweepers UPDATE any column of their assigned jobs (including prices).
-- All Sweeper actions now go through validated API routes (service role).
drop policy if exists "Sweepers can update assigned jobs" on public.jobs;
