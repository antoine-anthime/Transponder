export const useBookmarks = () => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
  const bookmarkedIds = useState<number[]>('bookmarks', () => [])

  const fetchBookmarks = async () => {
    if (!user.value) return
    const { data } = await supabase
      .from('user_bookmarks')
      .select('category_id')
      .eq('user_id', user.value.id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    bookmarkedIds.value = data?.map((b: any) => Number(b.category_id)) ?? []
  }

  const isBookmarked = (categoryId: number) =>
    bookmarkedIds.value.includes(categoryId)

  const toggleBookmark = async (categoryId: number) => {
    if (!user.value) return
    if (isBookmarked(categoryId)) {
      bookmarkedIds.value = bookmarkedIds.value.filter(id => id !== categoryId)
      await supabase
        .from('user_bookmarks')
        .delete()
        .eq('user_id', user.value.id)
        .eq('category_id', categoryId)
    } else {
      bookmarkedIds.value = [...bookmarkedIds.value, categoryId]
      await supabase
        .from('user_bookmarks')
        .insert({ user_id: user.value.id, category_id: categoryId })
    }
  }

  return { bookmarkedIds, isBookmarked, fetchBookmarks, toggleBookmark }
}
