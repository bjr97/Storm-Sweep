-- Migration 002 — partners
-- All money columns are integer cents.

create table if not exists public.partners (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  type text check (type in ('roofing','realtor','lawn','hoa','inspector','other')) not null,
  referral_code text unique not null,
  contact_name text,
  contact_phone text,
  payout_per_referral integer default 2000,
  total_referrals integer default 0,
  total_payout_owed integer default 0,
  total_paid_out integer default 0,
  active boolean default true,
  notes text,
  created_at timestamptz default now()
);

alter table public.partners enable row level security;
create policy "Admins only" on public.partners for all using (public.is_admin());
