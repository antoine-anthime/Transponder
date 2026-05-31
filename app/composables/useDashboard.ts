import type { Article, Category, Feed } from '~/types'

export interface DashboardArticle extends Article {
  feedId: number
  feedName: string
  categoryId: number
  categoryName: string
  categorySlug: string
}

export interface DashboardSection {
  categoryId: number
  categoryName: string
  categorySlug: string
  articles: DashboardArticle[]
}

export const useDashboard = () => {
  const dashboardArticles = useState<DashboardArticle[]>('dashboardArticles', () => [])
  const dashboardLoading = ref(false)

  /**
   * Fetch articles for every pinned feed and return them:
   * - as a flat list sorted by pubDate desc (dashboardArticles)
   * - as grouped sections sorted by most-recent article in each section
   *
   * @param pinnedFeedIds  IDs of pinned feeds
   * @param allCategories  Full category catalogue (needed to resolve feed → category)
   */
  const fetchDashboard = async (pinnedFeedIds: number[], allCategories: Category[]) => {
    if (!pinnedFeedIds.length) {
      dashboardArticles.value = []
      return
    }
    dashboardLoading.value = true

    // Build a quick lookup: feedId → { feed, category }
    const feedMap = new Map<number, { feed: Feed, category: Category }>()
    for (const cat of allCategories) {
      for (const feed of (cat.feeds ?? [])) {
        feedMap.set(feed.id, { feed, category: cat })
      }
    }

    const results = await Promise.allSettled(
      pinnedFeedIds.map(async (feedId) => {
        const entry = feedMap.get(feedId)
        if (!entry) return [] as DashboardArticle[]
        const { feed, category } = entry
        const articles = await $fetch<Article[]>('/api/news', { query: { url: feed.url } })
        return articles.slice(0, 10).map(a => ({
          ...a,
          feedId: feed.id,
          feedName: feed.name,
          categoryId: category.id,
          categoryName: category.name,
          categorySlug: category.slug,
        })) as DashboardArticle[]
      }),
    )

    const flat: DashboardArticle[] = []
    for (const r of results) {
      if (r.status === 'fulfilled') flat.push(...r.value)
    }

    flat.sort((a, b) => {
      if (!a.pubDate) return 1
      if (!b.pubDate) return -1
      return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
    })

    dashboardArticles.value = flat
    dashboardLoading.value = false
  }

  /** Group flat articles into sections, each sorted by most-recent first */
  const dashboardSections = computed<DashboardSection[]>(() => {
    const map = new Map<number, DashboardSection>()
    for (const a of dashboardArticles.value) {
      if (!map.has(a.categoryId)) {
        map.set(a.categoryId, {
          categoryId: a.categoryId,
          categoryName: a.categoryName,
          categorySlug: a.categorySlug,
          articles: [],
        })
      }
      map.get(a.categoryId)!.articles.push(a)
    }
    // Sort sections by their most-recent article
    return [...map.values()].sort((a, b) => {
      const latestA = new Date(a.articles[0]?.pubDate ?? 0).getTime()
      const latestB = new Date(b.articles[0]?.pubDate ?? 0).getTime()
      return latestB - latestA
    })
  })

  return { dashboardArticles, dashboardSections, dashboardLoading, fetchDashboard }
}
