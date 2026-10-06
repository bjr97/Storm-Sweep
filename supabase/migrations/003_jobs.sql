-- Migration 003 — jobs
-- All money columns (total_amount, deposit_amount, photo_surcharge) are integer cents.

create table if not exists public.jobs (
  id uuid default gen_random_uuid() primary key,
  customer_id uuid references public.profiles(id) not null,
  sweeper_id uuid references public.profiles(id),
  status text check (status in ('pending','confirmed','in_progress','complete','cancelled')) default 'pending',
  service_type text[] not null default '{}',
  scheduled_at timestamptz,
  address text not null,
  shelter_size text check (shelter_size in ('small','standard','large','xlarge')) default 'standard',
  notes text,
  checklist_progress jsonb default '{}',
  upgrade_flags jsonb default '{}',
  total_amount integer not null,
  deposit_amount integer default 0,
  payment_status text check (payment_status in ('unpaid','deposit_paid','paid','refunded')) default 'unpaid',
  stripe_payment_intent_id text,
  paypal_order_id text,
  photo_urls text[] default '{}',
  photo_grade text,
  photo_flags text[] default '{}',
  photo_approved boolean default true,
  photo_surcharge integer default 0,
  photo_admin_note text,
  admin_reviewed_at timestamptz,
  customer_signed_at timestamptz,
  referral_source text,
  partner_id uuid references public.partners(id),
  completed_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists jobs_customer_id_idx on public.jobs (customer_id);
create index if not exists jobs_sweeper_id_idx on public.jobs (sweeper_id);
create index if not exists jobs_scheduled_at_idx on public.jobs (scheduled_at);

alter table public.jobs enable row level security;
create policy "Customers see own jobs" on public.jobs for select using (auth.uid() = customer_id);
create policy "Sweepers see assigned jobs" on public.jobs for select using (auth.uid() = sweeper_id);
create policy "Sweepers can update assigned jobs" on public.jobs for update using (auth.uid() = sweeper_id);
create policy "Admins see all jobs" on public.jobs for all using (public.is_admin());
