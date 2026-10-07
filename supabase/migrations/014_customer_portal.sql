-- Migration 014 — Customer portal (Phase 3): marketing photo consent,
-- customer reschedule/cancel tracking, refund follow-up.

alter table public.profiles
  -- Account-wide opt-in to marketing use of before/after photos. Default OFF.
  -- Mirrored onto job_photos.customer_consent (the flag publishing checks).
  add column if not exists marketing_photo_consent boolean not null default false;

alter table public.jobs
  add column if not exists rescheduled_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by text check (cancelled_by in ('customer', 'admin')),
  -- A paid deposit on a cancelled job that still needs refunding (manual until Stripe is live).
  add column if not exists refund_due boolean not null default false;
