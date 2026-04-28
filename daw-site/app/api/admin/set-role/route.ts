import { createClient } from '@/lib/supabase-server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const VALID_ROLES = ['admin', 'creative', 'writer', 'fan'] as const
type Role = typeof VALID_ROLES[number]

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.app_metadata?.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await request.json()
  const { userId, role } = body as { userId: string; role: Role }

  if (!userId || !VALID_ROLES.includes(role)) {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  // Prevent admin from stripping their own admin role
  if (userId === user.id && role !== 'admin') {
    return Response.json({ error: 'Cannot change your own role' }, { status: 400 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    return Response.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }, { status: 500 })
  }

  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)
  const { error } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: { role: role === 'fan' ? null : role },
  })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
}
