-- Migration 010 — storage buckets + policies

insert into storage.buckets (id, name, public) values
  ('job-photos', 'job-photos', false),
  ('job-videos', 'job-videos', false),
  ('applicant-tools', 'applicant-tools', false),
  ('agreements', 'agreements', false)
on conflict (id) do nothing;

create policy "Sweepers upload job photos" on storage.objects for insert
  with check (bucket_id = 'job-photos' and auth.role() = 'authenticated');
create policy "Authenticated read job photos" on storage.objects for select
  using (bucket_id = 'job-photos' and auth.role() = 'authenticated');

-- Booking Step 4 (PhotoUpload.tsx) uploads from the browser before the
-- customer has an account, under booking-screen/<bookingId>/... Allow
-- anonymous inserts into that prefix only (no read, no overwrite).
create policy "Anon upload booking screen photos" on storage.objects for insert to anon
  with check (bucket_id = 'job-photos' and (storage.foldername(name))[1] = 'booking-screen');

-- applicant-tools and agreements are written by API routes using the service
-- role (bypasses RLS), so those buckets need no extra policies.
