import Parser from 'rss-parser'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { url } = body ?? {}

  if (!url || typeof url !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'URL manquante' })
  }

  const parser = new Parser({ timeout: 8000 })

  try {
    const feed = await parser.parseURL(url.trim())
    return {
      title: feed.title?.trim() || new URL(url).hostname,
      description: feed.description?.trim() || '',
    }
  } catch {
    throw createError({ statusCode: 422, statusMessage: 'Flux RSS invalide ou inaccessible' })
  }
})
