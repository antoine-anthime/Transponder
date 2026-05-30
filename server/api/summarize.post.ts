import OpenAI from 'openai'
import { serverSupabaseClient } from '#supabase/server'

const SYSTEM_PROMPT = `Tu es un assistant qui résume des articles de presse en français de façon concise.
Réponds UNIQUEMENT avec ce format exact, sans autre texte avant ou après :

• [point clé 1, max 20 mots]
• [point clé 2, max 20 mots]
• [point clé 3, max 20 mots]

💡 [Pourquoi c'est important, max 25 mots]`

export default defineEventHandler(async (event) => {
  const { title, contentSnippet, articleUrl } = await readBody(event)

  if (!title || !articleUrl) {
    throw createError({ statusCode: 400, statusMessage: 'Paramètres manquants (title, articleUrl)' })
  }

  const client = await serverSupabaseClient(event)
  const { data: { user } } = await client.auth.getUser()

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Non authentifié' })
  }

  // Vérifier le cache
  const { data: cached } = await client
    .from('article_summaries')
    .select('summary')
    .eq('article_url', articleUrl)
    .single()

  if (cached?.summary) {
    return { summary: cached.summary, cached: true }
  }

  // Appel LLM
  const config = useRuntimeConfig()

  const openai = new OpenAI({
    baseURL: config.openaiBaseUrl,
    apiKey: config.openaiApiKey || 'ollama',
  })

  let summary: string

  try {
    const completion = await openai.chat.completions.create({
      model: config.aiModel,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Titre : ${title}\n\nContenu : ${contentSnippet || 'Pas de contenu disponible.'}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 300,
    })

    summary = completion.choices[0]?.message?.content?.trim() ?? ''
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur LLM'
    throw createError({ statusCode: 502, statusMessage: `Erreur lors de la génération : ${message}` })
  }

  if (!summary) {
    throw createError({ statusCode: 502, statusMessage: 'Le modèle n\'a retourné aucun contenu' })
  }

  // Sauvegarder en cache
  await client
    .from('article_summaries')
    .upsert({ user_id: user.id, article_url: articleUrl, summary })

  return { summary, cached: false }
})
