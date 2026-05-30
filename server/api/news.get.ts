import Parser from 'rss-parser'

export default defineEventHandler(async (event) => {
  const { url } = getQuery(event)

  if (!url || typeof url !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Paramètre url manquant' })
  }

  const parser = new Parser({ timeout: 8000 })

  try {
    const feed = await parser.parseURL(url)
    return feed.items.slice(0, 30).map(item => ({
      title: item.title ?? '',
      link: item.link ?? '',
      contentSnippet: item.contentSnippet ?? '',
      content: item.content ?? '',
      pubDate: item.pubDate ?? '',
      creator: item.creator ?? '',
    }))
  } catch {
    throw createError({ statusCode: 502, statusMessage: 'Impossible de charger ce flux RSS' })
  }
})
