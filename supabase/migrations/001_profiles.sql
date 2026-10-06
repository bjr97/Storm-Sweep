-- Migration 001 — profiles + is_admin() helper

create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  role text check (role in ('customer', 'sweeper', 'admin')) not null default 'customer',
  full_name text,
  phone text,
  address text,
  membership_status text check (membership_status in ('none','active','cancelled','past_due')) default 'none',
  membership_plan text check (membership_plan in ('annual','monthly')),
  stripe_customer_id text,
  stripe_subscription_id text,
  membership_renews_at timestamptz,
  created_at timestamptz default now()
);

-- Admin check used by every "admins can ..." policy. SECURITY DEFINER so it
-- bypasses RLS. Querying profiles directly inside a profiles policy (as SPEC.md
-- originally wrote it) fails with "infinite recursion detected in policy".
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Admins can manage all profiles" on public.profiles for all using (public.is_admin());

-- Users may only edit their contact fields. Without this, "update own profile"
-- would let a customer set role = 'admin' or membership_status = 'active'.
-- role / membership / stripe columns are written by the service role only.
revoke update on public.profiles from authenticated, anon;
grant update (full_name, phone, address) on public.profiles to authenticated;
