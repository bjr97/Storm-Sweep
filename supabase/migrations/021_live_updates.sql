-- Migration 021 — Live updates. Any change to a job broadcasts an empty
-- "changed" ping on the private Realtime topic 'jobs-changes'; signed-in pages
-- re-fetch their own data (RLS/server checks still decide what they see).
-- The ping carries no job data. A Realtime hiccup must never block a job write.

create or replace function public.broadcast_jobs_changed()
returns trigger
language plpgsql
security definer
set search_path = public
as '
begin
  begin
    perform realtime.send(''{}''::jsonb, ''changed'', ''jobs-changes'', true);
  exception when others then
    null;
  end;
  return null;
end;
';

drop trigger if exists jobs_changed_broadcast on public.jobs;
create trigger jobs_changed_broadcast
  after insert or update or delete on public.jobs
  for each row execute function public.broadcast_jobs_changed();

-- Signed-in users may LISTEN on this topic; nobody may send to it from a browser.
drop policy if exists "signed-in users hear job changes" on realtime.messages;
create policy "signed-in users hear job changes" on realtime.messages
  for select to authenticated
  using (realtime.topic() = 'jobs-changes' and extension = 'broadcast');
