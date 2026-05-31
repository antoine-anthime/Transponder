import type { UserFeed } from '~/types'

// All operations go through Nitro server routes to avoid the JWT/RLS issue
// that affects the browser Supabase client in SSR-hydrated composables.
export const useUserFeeds = () => {
  const userFeeds = useState<UserFeed[]>('userFeeds', () => [])

  const fetchUserFeeds = async () => {
    try {
      const data = await $fetch<UserFeed[]>('/api/user-feeds')
      userFeeds.value = data
    } catch {
      // unauthenticated or network error — silently leave state empty
    }
  }

  const addUserFeed = async (name: string, url: string, description?: string) => {
    const data = await $fetch<UserFeed>('/api/user-feeds', {
      method: 'POST',
      body: { name, url, description },
    })
    userFeeds.value = [...userFeeds.value, data]
  }

  const removeUserFeed = async (id: number) => {
    userFeeds.value = userFeeds.value.filter(f => f.id !== id)
    await $fetch(`/api/user-feeds/${id}`, { method: 'DELETE' })
  }

  return { userFeeds, fetchUserFeeds, addUserFeed, removeUserFeed }
}
