# Transponder — Architecture

## Table of contents

1. [System overview](#1-system-overview)
2. [Database schema](#2-database-schema)
3. [Auth flow](#3-auth-flow)
4. [AI summary flow](#4-ai-summary-flow)
5. [Deployment topology](#5-deployment-topology)

---

## 1. System overview

```mermaid
flowchart TB
  subgraph client ["Browser (Vue 3)"]
    pages["Nuxt Pages"]
    shadcn["shadcn-vue + Tailwind v4"]
    composables["useCategories · useBookmarks"]
  end

  subgraph server ["Nitro Server (Node 22)"]
    rss["/api/news"]
    summarize["/api/summarize"]
  end

  subgraph supabase ["Supabase (BaaS)"]
    auth["Auth\n(magic link / OAuth)"]
    db[("Postgres + RLS")]
  end

  subgraph ai ["AI provider"]
    ollama["Ollama\n(local / Docker)"]
    groq["Groq\n(cloud)"]
  end

  pages --> auth
  composables --> db
  pages --> rss --> external["RSS Feeds (external)"]
  pages --> summarize --> ollama
  pages --> summarize --> groq
  summarize --> db
```

### Key design decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| SSR framework | Nuxt 4 | File-based routing, Nitro for API routes, Vue 3 ecosystem |
| Auth | Supabase Auth | Zero-config magic link + GitHub OAuth, integrates with Postgres RLS |
| UI library | shadcn-vue (new-york) | Accessible, unstyled by default, Tailwind v4 compatible |
| AI layer | openai SDK + configurable base URL | Provider-agnostic: Ollama locally, Groq in prod |
| Data persistence | Supabase Postgres | Single source of truth for feeds, bookmarks, and AI cache |
| Containerisation | Docker multi-stage | Small image (~170 MB), non-root user, secrets injected at runtime |

---

## 2. Database schema

```mermaid
erDiagram
  categories {
    uuid id PK
    text name
    text slug UK
    text description
    timestamptz created_at
  }

  feeds {
    uuid id PK
    uuid category_id FK
    text name
    text url
    text description
    boolean telex
    timestamptz created_at
  }

  user_bookmarks {
    uuid id PK
    uuid user_id FK
    uuid category_id FK
    timestamptz created_at
  }

  article_summaries {
    uuid id PK
    uuid user_id FK
    text article_url UK
    text summary
    timestamptz created_at
  }

  categories ||--o{ feeds : "has many"
  categories ||--o{ user_bookmarks : "bookmarked in"
  article_summaries }o--|| categories : ""
```

### Row Level Security policies

| Table | Policy | Rule |
|-------|--------|------|
| `categories` | Public read | `SELECT` — `true` |
| `feeds` | Public read | `SELECT` — `true` |
| `user_bookmarks` | Owner read/write | `user_id = auth.uid()` |
| `article_summaries` | Owner read/write | `user_id = auth.uid()` |

All writes (`INSERT`, `UPDATE`, `DELETE`) on `user_bookmarks` and `article_summaries` require an authenticated session.

---

## 3. Auth flow

### Magic link

```mermaid
sequenceDiagram
  actor User
  participant Login as /login (Vue)
  participant Supabase as Supabase Auth
  participant Email as User's inbox
  participant Confirm as /auth/confirm (Vue)
  participant App as / (index)

  User->>Login: enters email, clicks "Send link"
  Login->>Supabase: signInWithOtp({ email })
  Supabase-->>Email: sends magic link
  User->>Email: clicks link (redirects to /auth/confirm?token=…)
  Confirm->>Supabase: token exchanged automatically by @nuxtjs/supabase
  Supabase-->>Confirm: session established
  Confirm->>App: router.push('/') on user state change
```

### GitHub OAuth

```mermaid
sequenceDiagram
  actor User
  participant Login as /login (Vue)
  participant Supabase as Supabase Auth
  participant GitHub as GitHub
  participant Confirm as /auth/confirm (Vue)
  participant App as / (index)

  User->>Login: clicks "Continue with GitHub"
  Login->>Supabase: signInWithOAuth({ provider: 'github' })
  Supabase-->>GitHub: redirect to OAuth consent
  User->>GitHub: authorises app
  GitHub-->>Confirm: redirect to /auth/confirm with code
  Confirm->>Supabase: code exchanged automatically
  Supabase-->>Confirm: session established
  Confirm->>App: router.push('/')
```

---

## 4. AI summary flow

```mermaid
sequenceDiagram
  actor User
  participant Card as ArticleCard (Vue)
  participant API as POST /api/summarize (Nitro)
  participant Cache as article_summaries (Supabase)
  participant LLM as Ollama / Groq

  User->>Card: clicks ✨ (Sparkles button)
  Card->>API: POST { url, title, content }
  API->>API: verify auth session
  API->>Cache: SELECT where article_url = url AND user_id = uid
  alt Cache hit
    Cache-->>API: existing summary
    API-->>Card: { summary, cached: true }
  else Cache miss
    API->>LLM: chat.completions.create({ model, messages })
    LLM-->>API: 3-bullet summary (streaming disabled)
    API->>Cache: INSERT (user_id, article_url, summary)
    API-->>Card: { summary, cached: false }
  end
  Card->>User: displays summary in Sheet drawer
```

The API endpoint reads `NUXT_OPENAI_BASE_URL`, `NUXT_OPENAI_API_KEY`, and `NUXT_AI_MODEL` from `runtimeConfig`, making it fully provider-agnostic.

---

## 5. Deployment topology

### Path A — Vercel (serverless)

```mermaid
flowchart LR
  gh["GitHub\n(push to main)"]
  vercel["Vercel CI"]
  edge["Vercel Edge Network"]
  supabase["Supabase\n(Auth + Postgres)"]
  groq["Groq API\n(LLM)"]

  gh -->|webhook| vercel
  vercel -->|nuxt build\nNITRO_PRESET=vercel| edge
  edge -->|SSR + API routes| supabase
  edge -->|/api/summarize| groq
```

| Config | Value |
|--------|-------|
| Build command | `npm run build` (Vercel auto-detects) |
| Output directory | `.vercel/output` (Nitro vercel preset) |
| Node version | 22.x |
| `NITRO_PRESET` | Injected automatically by Vercel |

Env vars to add in Vercel dashboard: all 6 variables from `.env.example`, with Groq values for the AI ones.

---

### Path B — Docker (self-hosted / VPS)

```mermaid
flowchart LR
  subgraph host ["Docker host (VPS)"]
    app["transponder\n(node:22-alpine\nport 3000)"]
    ollama["ollama/ollama\n(port 11434)"]
    vol[("ollama_data\nvolume")]
  end

  client["Browser"] -->|HTTP :3000| app
  app -->|"http://ollama:11434/v1\n(Docker network)"| ollama
  ollama --- vol
  app -->|Supabase SDK| supabase["Supabase Cloud"]
```

| Stage | Base image | Purpose |
|-------|-----------|---------|
| `builder` | `node:22-alpine` | Install deps, `npm run build` |
| `runner` | `node:22-alpine` | Copy `.output/`, run as non-root |

Image size target: ~170 MB. The `.output` directory is fully self-contained (no `node_modules` needed at runtime).

```bash
# Single container
docker build -t transponder .
docker run -p 3000:3000 --env-file .env transponder

# Full stack with Ollama
docker compose up -d
docker compose exec ollama ollama pull llama3.2:3b
```
