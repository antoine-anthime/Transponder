import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Non authentifié' })

  const { name, url, description } = await readBody(event)
  if (!name || !url) throw createError({ statusCode: 400, statusMessage: 'Paramètres manquants' })

  // Service role bypasses RLS — user identity is validated above via serverSupabaseUser
  // serverSupabaseUser returns JWT claims: user ID is in `sub`, not `id`
  const client = serverSupabaseServiceRole(event)
  const { data, error } = await client
    .from('user_feeds')
    .insert({ user_id: user.sub, name, url, description: description || null })
    .select('id, name, url, description')
    .single()

  if (error) throw createError({ statusCode: 400, statusMessage: error.message })
  return data
})
