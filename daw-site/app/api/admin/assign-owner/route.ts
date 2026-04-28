import { createClient } from '@/lib/supabase-server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { targetId, targetType, userId } = await request.json() as { targetId: string; targetType: string; userId: string | null }

  if (!targetId || !['wrestlers', 'teams'].includes(targetType)) {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return Response.json({ error: 'Service key not configured' }, { status: 500 })

  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)

  if (userId) {
    // Get auth user details to populate profile display name
    const { data: authUser } = await admin.auth.admin.getUserById(userId)
    const displayName = authUser?.user?.user_metadata?.full_name
      || authUser?.user?.user_metadata?.name
      || authUser?.user?.user_metadata?.preferred_username
      || authUser?.user?.email?.split('@')[0]
      || null

    // Ensure profile row exists (create if missing, don't overwrite existing)
    const { error: profileErr } = await admin.from('profiles').upsert(
      { id: userId, display_name: displayName },
      { onConflict: 'id', ignoreDuplicates: true }
    )
    if (profileErr) return Response.json({ error: profileErr.message }, { status: 500 })
  }

  const { error } = await admin.from(targetType).update({ submitted_by: userId }).eq('id', targetId)
  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ success: true })
}
