import type { Category } from '~/types'

export const useCategories = () => {
  const supabase = useSupabaseClient()
  const categories = useState<Category[]>('categories', () => [])
  const pending = ref(false)

  const fetchCategories = async () => {
    pending.value = true
    const { data } = await supabase
      .from('categories')
      .select('id, name, slug, description, feeds(id, name, url, description, telex, category_id)')
      .order('name')
    categories.value = (data as Category[]) ?? []
    pending.value = false
  }

  return { categories, pending, fetchCategories }
}
