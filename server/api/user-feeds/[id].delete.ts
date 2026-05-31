import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Non authentifié' })

  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID manquant' })

  // Service role bypasses RLS — we enforce ownership with .eq('user_id', user.sub)
  // serverSupabaseUser returns JWT claims: user ID is in `sub`, not `id`
  const client = serverSupabaseServiceRole(event)
  const { error } = await client
    .from('user_feeds')
    .delete()
    .eq('id', id)
    .eq('user_id', user.sub)

  if (error) throw createError({ statusCode: 400, statusMessage: error.message })
  return { ok: true }
})
