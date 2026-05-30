-- ─────────────────────────────────────────────────
-- Orbit News v3 — Seed data
-- ─────────────────────────────────────────────────

-- ── Catégories ────────────────────────────────────

insert into public.categories (name, slug, description) values
  ('Technology',    'technology',    'Latest updates and news in the world of technology'),
  ('Business',      'business',      'News and insights from the business world'),
  ('Sports',        'sports',        'Latest sports news and updates'),
  ('Health',        'health',        'Health news and medical advancements'),
  ('Science',       'science',       'Updates and discoveries in the science world'),
  ('Entertainment', 'entertainment', 'News from the entertainment industry'),
  ('Politics',      'politics',      'Political news and analysis'),
  ('Gaming',        'gaming',        'News and reviews from the gaming industry'),
  ('World News',    'world-news',    'Global news and updates'),
  ('Finance',       'finance',       'Financial news and market updates'),
  ('JRPGs',         'jrpgs',         'News about Japanese role-playing games'),
  ('CRPGs',         'crpgs',         'News about computer role-playing games'),
  ('Twitch',        'twitch',        'Updates and news from the Twitch platform'),
  ('YouTube',       'youtube',       'News and updates from YouTube'),
  ('Anime',         'anime',         'Latest news in the world of anime'),
  ('Podcasts',      'podcasts',      'Updates from popular podcasts'),
  ('Movies',        'movies',        'News and updates from the movie industry'),
  ('TV Shows',      'tv-shows',      'News and updates from the TV industry'),
  ('Comics',        'comics',        'Latest news and updates in comics'),
  ('Music',         'music',         'News and updates from the music industry');

-- ── Flux RSS par catégorie ─────────────────────────
-- (quelques exemples pour démarrer — à compléter)

insert into public.feeds (category_id, name, url, description, telex) values
  -- Technology
  ((select id from public.categories where slug = 'technology'),
   'Ars Technica', 'https://feeds.arstechnica.com/arstechnica/index',
   'In-depth tech news', false),
  ((select id from public.categories where slug = 'technology'),
   'The Verge', 'https://www.theverge.com/rss/index.xml',
   'Tech, science, art, and culture', false),
  ((select id from public.categories where slug = 'technology'),
   'Hacker News (top)', 'https://hnrss.org/frontpage',
   'Top stories from Hacker News', false),

  -- Gaming
  ((select id from public.categories where slug = 'gaming'),
   'Eurogamer', 'https://www.eurogamer.net/feed',
   'Games news and reviews', false),
  ((select id from public.categories where slug = 'gaming'),
   'Rock Paper Shotgun', 'https://www.rockpapershotgun.com/feed',
   'PC gaming news', false),

  -- World News
  ((select id from public.categories where slug = 'world-news'),
   'BBC World', 'https://feeds.bbci.co.uk/news/world/rss.xml',
   'BBC international news', true),
  ((select id from public.categories where slug = 'world-news'),
   'Reuters', 'https://feeds.reuters.com/reuters/worldNews',
   'Reuters world news', false),

  -- Science
  ((select id from public.categories where slug = 'science'),
   'NASA', 'https://www.nasa.gov/rss/dyn/breaking_news.rss',
   'NASA breaking news', false),
  ((select id from public.categories where slug = 'science'),
   'New Scientist', 'https://www.newscientist.com/feed/home/',
   'Science news and features', false),

  -- Finance
  ((select id from public.categories where slug = 'finance'),
   'Financial Times', 'https://www.ft.com/rss/home',
   'FT global finance news', false),

  -- JRPGs
  ((select id from public.categories where slug = 'jrpgs'),
   'RPGFan', 'https://www.rpgfan.com/feed/',
   'RPG news, reviews and features', false),

  -- Anime
  ((select id from public.categories where slug = 'anime'),
   'Anime News Network', 'https://www.animenewsnetwork.com/newsroom/rss.xml',
   'Anime and manga news', false),

  -- Movies
  ((select id from public.categories where slug = 'movies'),
   'IndieWire', 'https://www.indiewire.com/feed/',
   'Film news and reviews', false),

  -- Music
  ((select id from public.categories where slug = 'music'),
   'Pitchfork', 'https://pitchfork.com/rss/news',
   'Music news and reviews', false);
