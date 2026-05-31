import type { Feed } from '~/types'

const MAX_PINNED = 5

export const useDashboardFeeds = () => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  // Set of pinned feed IDs
  const dashboardFeedIds = useState<number[]>('dashboardFeedIds', () => [])

  const fetchDashboardFeeds = async () => {
    if (!user.value?.sub) return
    const { data } = await supabase
      .from('user_dashboard_feeds')
      .select('feed_id')
      .eq('user_id', user.value.sub)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dashboardFeedIds.value = data?.map((r: any) => Number(r.feed_id)) ?? []
  }

  const isDashboardFeed = (feedId: number) => dashboardFeedIds.value.includes(feedId)

  const toggleDashboardFeed = async (feed: Feed) => {
    if (!user.value?.sub) return

    if (isDashboardFeed(feed.id)) {
      // Unpin — optimistic
      dashboardFeedIds.value = dashboardFeedIds.value.filter(id => id !== feed.id)
      await supabase
        .from('user_dashboard_feeds')
        .delete()
        .eq('user_id', user.value.sub)
        .eq('feed_id', feed.id)
    } else {
      if (dashboardFeedIds.value.length >= MAX_PINNED) return
      // Pin — optimistic
      dashboardFeedIds.value = [...dashboardFeedIds.value, feed.id]
      await supabase
        .from('user_dashboard_feeds')
        .insert({ user_id: user.value.sub, feed_id: feed.id })
    }
  }

  return {
    dashboardFeedIds,
    isDashboardFeed,
    fetchDashboardFeeds,
    toggleDashboardFeed,
    maxPinned: MAX_PINNED,
  }
}
