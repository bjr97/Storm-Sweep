-- Migration 025 — Sweeper onboarding. Modules read + quiz passed before claiming jobs.

alter table public.profiles
  add column if not exists training_progress jsonb not null default '{}'::jsonb,
  add column if not exists training_completed_at timestamptz,
  add column if not exists training_waived boolean not null default false;
