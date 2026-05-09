import { createClient } from '@/lib/supabase-server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.app_metadata?.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    return Response.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }, { status: 500 })
  }

  const { userId, identityId } = await req.json()
  if (!userId || !identityId) {
    return Response.json({ error: 'Missing userId or identityId' }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const res = await fetch(
    `${supabaseUrl}/auth/v1/admin/users/${userId}/identities/${identityId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey,
      },
    }
  )

  if (!res.ok) {
    const body = await res.text()
    return Response.json({ error: body || 'Failed to unlink identity' }, { status: res.status })
  }

  return Response.json({ ok: true })
}
