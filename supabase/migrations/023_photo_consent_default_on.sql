-- Migration 023 — Social photo sharing starts ON for new accounts (owner's
-- decision, 2026-10-08). Shown as a pre-checked box at sign-up and booking;
-- unticking it (or the Account toggle) opts out. Existing rows are unchanged.

alter table public.profiles
  alter column marketing_photo_consent set default true;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as '
begin
  insert into public.profiles (id, role, full_name, phone, marketing_photo_consent)
  values (
    new.id,
    ''customer'',
    new.raw_user_meta_data ->> ''full_name'',
    new.raw_user_meta_data ->> ''phone'',
    coalesce((new.raw_user_meta_data ->> ''marketing_photo_consent'')::boolean, true)
  );
  return new;
end;
';
