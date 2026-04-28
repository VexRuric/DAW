import { createClient } from '@/lib/supabase-server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { deleteUserId, keepUserId } = await request.json() as { deleteUserId: string; keepUserId: string }
  if (!deleteUserId || !keepUserId || deleteUserId === keepUserId) {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }
  if (deleteUserId === user.id) {
    return Response.json({ error: 'Cannot delete your own account' }, { status: 400 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return Response.json({ error: 'Service key not configured' }, { status: 500 })

  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)

  // Ensure profile row exists for the account being kept
  const { data: authUser } = await admin.auth.admin.getUserById(keepUserId)
  const displayName = authUser?.user?.user_metadata?.full_name
    || authUser?.user?.user_metadata?.name
    || authUser?.user?.user_metadata?.preferred_username
    || authUser?.user?.email?.split('@')[0]
    || null

  const { error: profileErr } = await admin.from('profiles').upsert(
    { id: keepUserId, display_name: displayName },
    { onConflict: 'id', ignoreDuplicates: true }
  )
  if (profileErr) return Response.json({ error: profileErr.message }, { status: 500 })

  // Transfer all wrestlers and factions to the kept account
  await admin.from('wrestlers').update({ submitted_by: keepUserId }).eq('submitted_by', deleteUserId)
  await admin.from('teams').update({ submitted_by: keepUserId }).eq('submitted_by', deleteUserId)

  // Delete the merged account
  const { error } = await admin.auth.admin.deleteUser(deleteUserId)
  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ success: true })
}
