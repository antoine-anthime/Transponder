import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Non authentifié' })

  const client = serverSupabaseServiceRole(event)
  const { data, error } = await client
    .from('user_feeds')
    .select('id, name, url, description')
    .eq('user_id', user.sub)
    .order('created_at')

  if (error) throw createError({ statusCode: 400, statusMessage: error.message })
  return data ?? []
})
