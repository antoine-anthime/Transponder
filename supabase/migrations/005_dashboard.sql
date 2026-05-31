-- ─────────────────────────────────────────────────
-- Migration 005 — Dashboard épinglé
-- ─────────────────────────────────────────────────

alter table public.user_bookmarks
  add column if not exists dashboard boolean not null default false;
