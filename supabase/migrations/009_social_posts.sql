-- Migration 009 — social_posts (Phase 4)
-- SPEC.md left RLS off; enabled here (admin-only) so the table isn't publicly readable.

create table if not exists public.social_posts (
  id uuid default gen_random_uuid() primary key,
  job_id uuid references public.jobs(id),
  platform text check (platform in ('tiktok','instagram','facebook')) not null,
  publish_id text,
  caption text,
  video_path text,
  customer_consent boolean default false,
  views integer default 0,
  likes integer default 0,
  shares integer default 0,
  published_at timestamptz,
  analytics_synced_at timestamptz,
  created_at timestamptz default now()
);

alter table public.social_posts enable row level security;
create policy "Admins only" on public.social_posts for all using (public.is_admin());
