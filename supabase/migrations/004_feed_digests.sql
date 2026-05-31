-- ─────────────────────────────────────────────────
-- Migration 004 — Digests de flux (cache IA)
-- ─────────────────────────────────────────────────

create table public.feed_digests (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references auth.users (id) on delete cascade,
  feed_url     text not null,
  period       text not null check (period in ('today', 'yesterday', 'week', 'month')),
  cache_date   date not null default current_date,
  article_count int not null,
  digest       text not null,
  created_at   timestamptz not null default now(),
  unique (user_id, feed_url, period, cache_date)
);

alter table public.feed_digests enable row level security;

create policy "feed_digests: lecture personnelle"
  on public.feed_digests for select
  using (auth.uid() = user_id);

create policy "feed_digests: insertion personnelle"
  on public.feed_digests for insert
  with check (auth.uid() = user_id);

grant select, insert on public.feed_digests to authenticated;
