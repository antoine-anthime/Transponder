-- ─────────────────────────────────────────────────
-- Orbit News v3 — Migration initiale
-- ─────────────────────────────────────────────────

-- ── Tables catalogue (publiques) ──────────────────

create table public.categories (
  id          bigint generated always as identity primary key,
  name        text not null unique,
  description text,
  slug        text not null unique,
  created_at  timestamptz not null default now()
);

create table public.feeds (
  id          bigint generated always as identity primary key,
  category_id bigint not null references public.categories (id) on delete cascade,
  name        text not null,
  url         text not null,
  description text,
  telex       boolean not null default false,
  created_at  timestamptz not null default now()
);

create index feeds_category_id_idx on public.feeds (category_id);

-- ── Tables utilisateur (RLS strict) ───────────────

create table public.user_bookmarks (
  user_id     uuid not null references auth.users (id) on delete cascade,
  category_id bigint not null references public.categories (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, category_id)
);

create table public.article_summaries (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  article_url text not null,
  summary     text not null,
  created_at  timestamptz not null default now(),
  unique (user_id, article_url)
);

-- ── Row Level Security ────────────────────────────

alter table public.categories enable row level security;
alter table public.feeds enable row level security;
alter table public.user_bookmarks enable row level security;
alter table public.article_summaries enable row level security;

-- Catalogue : lecture publique (même non connecté)
create policy "categories: lecture publique"
  on public.categories for select using (true);

create policy "feeds: lecture publique"
  on public.feeds for select using (true);

-- Bookmarks : accès uniquement à ses propres données
create policy "bookmarks: lecture personnelle"
  on public.user_bookmarks for select
  using (auth.uid() = user_id);

create policy "bookmarks: insertion personnelle"
  on public.user_bookmarks for insert
  with check (auth.uid() = user_id);

create policy "bookmarks: suppression personnelle"
  on public.user_bookmarks for delete
  using (auth.uid() = user_id);

-- Résumés IA : accès uniquement à ses propres données
create policy "summaries: lecture personnelle"
  on public.article_summaries for select
  using (auth.uid() = user_id);

create policy "summaries: insertion personnelle"
  on public.article_summaries for insert
  with check (auth.uid() = user_id);
