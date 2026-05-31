import OpenAI from 'openai'
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

const PERIOD_LABELS: Record<string, string> = {
  today: 'aujourd\'hui (dernières 24h)',
  yesterday: 'hier (entre 24h et 48h)',
  week: 'les 7 derniers jours',
  month: 'les 30 derniers jours',
}

const SYSTEM_PROMPT = `Tu es un analyste de veille médiatique expert. À partir d'une liste d'articles RSS récents, génère un BRIEFING DE VEILLE structuré, concis et actionnable en français.

Utilise EXACTEMENT ce format, sans t'en écarter :

## Vue d'ensemble
[1 à 2 phrases synthétisant la tendance dominante du flux sur cette période]

## Sujets clés
• [Sujet 1 — 1 ligne percutante]
• [Sujet 2 — 1 ligne percutante]
• [Sujet 3 — 1 ligne percutante]
(entre 3 et 5 sujets)

## Articles notables
**[Titre exact de l'article]** — [une phrase expliquant pourquoi il est notable]
(entre 2 et 4 articles)

💡 Signal faible
[Une observation stratégique : tendance émergente, angle récurrent, absence notable, ou signal à surveiller]

Règles absolues :
- Réponds UNIQUEMENT en français
- Sois factuel, précis, sans redondance
- Ne dépasse pas 400 mots au total`

interface ArticleInput {
  title: string
  contentSnippet: string
  link: string
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Non authentifié' })

  const { feedUrl, feedName, period, articles } = await readBody<{
    feedUrl: string
    feedName: string
    period: string
    articles: ArticleInput[]
  }>(event)

  if (!feedUrl || !feedName || !period || !articles?.length) {
    throw createError({ statusCode: 400, statusMessage: 'Paramètres manquants' })
  }

  if (!PERIOD_LABELS[period]) {
    throw createError({ statusCode: 400, statusMessage: 'Période invalide' })
  }

  // ── Check cache ───────────────────────────────────────
  const client = serverSupabaseServiceRole(event)
  const today = new Date().toISOString().split('T')[0]

  const { data: cached } = await client
    .from('feed_digests')
    .select('digest, article_count')
    .eq('user_id', user.sub)
    .eq('feed_url', feedUrl)
    .eq('period', period)
    .eq('cache_date', today)
    .maybeSingle()

  if (cached) {
    return { digest: cached.digest, articleCount: cached.article_count, cached: true }
  }

  // ── Prepare input (cap at 20 articles, truncate content) ──
  const articlesForLLM = articles.slice(0, 20).map(a => {
    const title = a.title.slice(0, 120)
    const snippet = a.contentSnippet?.trim().slice(0, 200) ?? ''
    return snippet ? `- ${title} : ${snippet}` : `- ${title}`
  }).join('\n')

  const userMessage = [
    `Flux RSS : "${feedName}"`,
    `Période couverte : ${PERIOD_LABELS[period]}`,
    `Nombre d'articles analysés : ${articles.length}`,
    '',
    'Articles :',
    articlesForLLM,
  ].join('\n')

  // ── Call LLM ─────────────────────────────────────────
  const config = useRuntimeConfig()
  const openai = new OpenAI({
    baseURL: config.openaiBaseUrl as string,
    apiKey: config.openaiApiKey as string,
  })

  let digest: string
  try {
    const completion = await openai.chat.completions.create({
      model: config.aiModel as string,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.3,
      max_tokens: 900,
    })
    digest = completion.choices[0]?.message?.content?.trim() ?? ''
    if (!digest) throw new Error('Réponse vide')
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur LLM'
    throw createError({ statusCode: 502, statusMessage: msg })
  }

  // ── Save to cache ─────────────────────────────────────
  await client.from('feed_digests').upsert({
    user_id: user.sub,
    feed_url: feedUrl,
    period,
    cache_date: today,
    article_count: articles.length,
    digest,
  })

  return { digest, articleCount: articles.length, cached: false }
})
