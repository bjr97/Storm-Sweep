-- Migration 020 — Promo codes ($ or % off a booking), managed on /admin/marketing.

create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(code) and code ~ '^[A-Z0-9]{3,24}$'),
  kind text not null check (kind in ('amount', 'percent')),
  -- amount: cents off; percent: whole percent (1-100)
  value integer not null check (value > 0),
  max_uses integer check (max_uses is null or max_uses > 0),
  first_time_only boolean not null default false,
  expires_on date,
  active boolean not null default true,
  note text,
  created_at timestamptz not null default now(),
  constraint promo_percent_range check (kind <> 'percent' or value <= 100)
);

alter table public.promo_codes enable row level security;

drop policy if exists "promo_codes admin all" on public.promo_codes;
create policy "promo_codes admin all" on public.promo_codes
  for all using (public.is_admin()) with check (public.is_admin());

alter table public.jobs
  add column if not exists promo_code_id uuid references public.promo_codes (id) on delete set null,
  add column if not exists promo_discount integer not null default 0;

create index if not exists jobs_promo_idx on public.jobs (promo_code_id) where promo_code_id is not null;
