import { createClient } from '@/lib/supabase-server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { userId } = await request.json() as { userId: string }
  if (!userId) return Response.json({ error: 'userId required' }, { status: 400 })
  if (userId === user.id) return Response.json({ error: 'Cannot retire your own account' }, { status: 400 })

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return Response.json({ error: 'Service key not configured' }, { status: 500 })

  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)

  // Unassign all wrestlers and factions owned by this user
  await admin.from('wrestlers').update({ submitted_by: null }).eq('submitted_by', userId)
  await admin.from('teams').update({ submitted_by: null }).eq('submitted_by', userId)

  // Delete the auth account (profile row will be cleaned up by FK cascade if configured, or stays as orphan)
  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ success: true })
}
