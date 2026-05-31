export const useReadArticles = () => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  // Set stored as a plain array in useState (Sets aren't serialisable in SSR state)
  const readUrls = useState<string[]>('readArticles', () => [])

  const fetchReadArticles = async () => {
    if (!user.value) return
    const { data } = await supabase
      .from('read_articles')
      .select('article_url')
      .eq('user_id', user.value.id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    readUrls.value = data?.map((r: any) => r.article_url) ?? []
  }

  const isRead = (url: string) => readUrls.value.includes(url)

  const markRead = async (url: string) => {
    if (!user.value || isRead(url)) return
    readUrls.value = [...readUrls.value, url]
    await supabase.from('read_articles').upsert({
      user_id: user.value.id,
      article_url: url,
    })
  }

  const markAllRead = async (urls: string[]) => {
    if (!user.value) return
    const unread = urls.filter(u => !isRead(u))
    if (!unread.length) return
    readUrls.value = [...readUrls.value, ...unread]
    await supabase.from('read_articles').upsert(
      unread.map(url => ({ user_id: user.value!.id, article_url: url })),
    )
  }

  return { isRead, markRead, markAllRead, fetchReadArticles }
}
