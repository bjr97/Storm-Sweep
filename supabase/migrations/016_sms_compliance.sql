-- Migration 016 — SMS opt-out compliance + inbound replies.

alter table public.profiles
  -- Replied STOP (or turned texts off in their account). Never text them.
  add column if not exists sms_opt_out boolean not null default false,
  add column if not exists sms_opt_out_at timestamptz;

-- Texts people send TO Storm Sweep (replies, STOP/START, questions).
create table if not exists public.sms_inbound (
  id uuid primary key default gen_random_uuid(),
  from_phone text not null,
  body text not null,
  profile_id uuid references public.profiles(id) on delete set null,
  keyword text,
  twilio_sid text,
  created_at timestamptz not null default now()
);
create index if not exists sms_inbound_created_idx on public.sms_inbound (created_at desc);
alter table public.sms_inbound enable row level security;
drop policy if exists "Admins read inbound texts" on public.sms_inbound;
create policy "Admins read inbound texts" on public.sms_inbound for all using (public.is_admin());

-- Admin follow-up on reviews (Reviews page).
alter table public.reviews
  add column if not exists admin_note text,
  add column if not exists followed_up_at timestamptz;
