-- Migration 018 — Balance collection + Sweeper paperwork tracking.

alter table public.jobs
  -- When the remaining balance (total − deposit) was collected, and how.
  add column if not exists balance_paid_at timestamptz,
  add column if not exists balance_method text check (balance_method in ('zelle', 'venmo', 'cash_app', 'check', 'cash', 'card', 'other')),
  add column if not exists balance_reference text;

alter table public.profiles
  -- Sweeper paperwork (the app never stores tax IDs — only that a W-9 is on file).
  add column if not exists w9_received_at timestamptz,
  add column if not exists insurance_expires_on date,
  add column if not exists paperwork_notes text;
