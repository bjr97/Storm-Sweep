-- Migration 019 — Demo accounts for previewing the customer and Sweeper apps.
-- Demo people and their jobs are flagged so they never mix with real data
-- (job board, revenue, payouts, 1099s, texts/emails all exclude them).

alter table public.profiles
  add column if not exists is_demo boolean not null default false;

alter table public.jobs
  add column if not exists is_demo boolean not null default false;

create index if not exists jobs_demo_idx on public.jobs (is_demo) where is_demo;
