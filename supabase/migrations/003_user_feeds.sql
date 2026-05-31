-- ─────────────────────────────────────────────────
-- Migration 003 — Sources personnalisées
-- ─────────────────────────────────────────────────

create table public.user_feeds (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  url         text not null,
  description text,
  created_at  timestamptz not null default now(),
  unique (user_id, url)
);

alter table public.user_feeds enable row level security;

create policy "user_feeds: lecture personnelle"
  on public.user_feeds for select
  using (auth.uid() = user_id);

create policy "user_feeds: insertion personnelle"
  on public.user_feeds for insert
  with check (auth.uid() = user_id);

create policy "user_feeds: suppression personnelle"
  on public.user_feeds for delete
  using (auth.uid() = user_id);

-- Grants explicites (le SQL Editor ne bénéficie pas des grants automatiques du dashboard)
grant select, insert, delete on public.user_feeds to authenticated;
grant select on public.user_feeds to anon;
