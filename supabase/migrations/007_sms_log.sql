-- Migration 007 — sms_log

create table if not exists public.sms_log (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid references public.profiles(id),
  job_id uuid references public.jobs(id),
  trigger text not null,
  body text not null,
  twilio_sid text,
  sent_at timestamptz default now()
);

alter table public.sms_log enable row level security;
create policy "Admins only" on public.sms_log for all using (public.is_admin());
