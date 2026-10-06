-- Migration 011 — Storm Ready visit tracking + sweeper pay basis
-- Membership covers 2 cleans per membership year (up to standard size); the
-- visit booked at signup is #1. Money columns are integer cents.

alter table public.profiles
  add column if not exists visits_used integer not null default 0,
  -- Monthly plan is a 12-month commitment; set when the subscription starts.
  add column if not exists membership_commitment_ends_at timestamptz;

alter table public.jobs
  -- Clean covered by the customer's Storm Ready membership.
  add column if not exists membership_visit boolean not null default false,
  -- List value of the services (as if sold one-time). Sweeper pay is a % of
  -- this, so member visits pay the same as paid ones. total_amount is what the
  -- customer actually pays for the visit and can be 0 for a covered clean.
  add column if not exists service_value integer;

-- visits_used / membership_commitment_ends_at are service-role-only: migration
-- 001 grants authenticated users UPDATE on (full_name, phone, address) only.
