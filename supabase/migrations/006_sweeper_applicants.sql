-- Migration 006 — sweeper_applicants
-- (SPEC.md calls this 005; renumbered because 005 is the new-user trigger.)

create table if not exists public.sweeper_applicants (
  id uuid default gen_random_uuid() primary key,
  full_name text not null,
  email text unique not null,
  phone text not null,
  availability text check (availability in ('weekdays','weekends','both')) not null,
  has_vehicle boolean default false,
  heard_about text,
  experience_notes text,
  tool_photos jsonb default '{}',
  all_tools_verified boolean default false,
  agreement_signed boolean default false,
  agreement_pdf_path text,
  status text check (status in ('pending','approved','rejected')) default 'pending',
  admin_notes text,
  profile_id uuid references public.profiles(id),
  applied_at timestamptz default now(),
  approved_at timestamptz
);

alter table public.sweeper_applicants enable row level security;
create policy "Admins only" on public.sweeper_applicants for all using (public.is_admin());
