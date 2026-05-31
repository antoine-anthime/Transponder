-- ─────────────────────────────────────────────────
-- Migration 002 — Articles lus
-- ─────────────────────────────────────────────────

create table public.read_articles (
  user_id     uuid not null references auth.users (id) on delete cascade,
  article_url text not null,
  read_at     timestamptz not null default now(),
  primary key (user_id, article_url)
);

alter table public.read_articles enable row level security;

create policy "read_articles: lecture personnelle"
  on public.read_articles for select
  using (auth.uid() = user_id);

create policy "read_articles: insertion personnelle"
  on public.read_articles for insert
  with check (auth.uid() = user_id);

create policy "read_articles: suppression personnelle"
  on public.read_articles for delete
  using (auth.uid() = user_id);
