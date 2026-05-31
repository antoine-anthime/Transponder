-- ─────────────────────────────────────────────────
-- Migration 006 — Dashboard par feed (Option A)
-- Remplace la colonne "dashboard" sur user_bookmarks
-- par une table dédiée user_dashboard_feeds.
-- ─────────────────────────────────────────────────

-- Retirer la colonne ajoutée en migration 005
alter table public.user_bookmarks
  drop column if exists dashboard;

-- Nouvelle table : feeds épinglés au dashboard (5 max côté app)
create table public.user_dashboard_feeds (
  user_id  uuid   not null references auth.users (id) on delete cascade,
  feed_id  bigint not null references public.feeds (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, feed_id)
);

alter table public.user_dashboard_feeds enable row level security;

create policy "dashboard_feeds: lecture personnelle"
  on public.user_dashboard_feeds for select
  using (auth.uid() = user_id);

create policy "dashboard_feeds: insertion personnelle"
  on public.user_dashboard_feeds for insert
  with check (auth.uid() = user_id);

create policy "dashboard_feeds: suppression personnelle"
  on public.user_dashboard_feeds for delete
  using (auth.uid() = user_id);

grant select, insert, delete on public.user_dashboard_feeds to authenticated;
