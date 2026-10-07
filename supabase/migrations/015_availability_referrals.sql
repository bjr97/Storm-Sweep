-- Migration 015 — Sweeper availability toggle + customer referral program.
-- All money columns are integer cents.

alter table public.profiles
  -- Sweeper "available for new jobs" switch (spec 2.1 online/offline toggle).
  add column if not exists sweeper_available boolean not null default true,
  -- Customer's share code for "Give $25, get $25" (generated on first view).
  add column if not exists referral_code text unique,
  -- Referral credit balance, applied automatically to their next booking.
  add column if not exists referral_credit integer not null default 0;

alter table public.jobs
  -- Customer who invited this (first-time) customer.
  add column if not exists referred_by uuid references public.profiles(id),
  -- Friend discount applied to this booking.
  add column if not exists referral_discount integer not null default 0,
  -- Booker's own referral credit spent on this booking.
  add column if not exists credit_applied integer not null default 0,
  -- When the referrer was credited (first completed visit of the friend).
  add column if not exists referral_rewarded_at timestamptz;
