-- Migration 026 — Launch checklist (/admin/launch). Manual to-dos; the page
-- also shows automatic checks computed from env + database. Starter items are
-- inserted by the app on first visit (a '_meta' row marks that it happened).

create table if not exists public.launch_tasks (
  id uuid primary key default gen_random_uuid(),
  section text not null check (section in ('business', 'insurance', 'brand', 'operations', 'website', '_meta')),
  title text not null check (char_length(title) between 1 and 200),
  notes text,
  link text,
  due_on date,
  done_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.launch_tasks enable row level security;
drop policy if exists "launch_tasks admin all" on public.launch_tasks;
create policy "launch_tasks admin all" on public.launch_tasks
  for all using (public.is_admin()) with check (public.is_admin());
