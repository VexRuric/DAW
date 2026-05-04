import { createClient } from '@/lib/supabase-server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { id, type } = body as { id?: string; type?: string }

  if (!id || !['wrestler', 'faction'].includes(type ?? '')) {
    return Response.json({ error: 'Missing or invalid fields' }, { status: 400 })
  }

  const table = type === 'wrestler' ? 'wrestlers' : 'teams'

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return Response.json({ error: 'Service key not configured' }, { status: 500 })
  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)

  // Verify ownership and that the creation is rejected before deleting
  const { data: row, error: fetchErr } = await admin
    .from(table)
    .select('submitted_by, status')
    .eq('id', id)
    .single()

  if (fetchErr || !row) return Response.json({ error: 'Not found' }, { status: 404 })
  if (row.submitted_by !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 })
  if (row.status !== 'rejected') return Response.json({ error: 'Only rejected creations can be deleted' }, { status: 400 })

  const { error: deleteErr } = await admin.from(table).delete().eq('id', id)
  if (deleteErr) return Response.json({ error: deleteErr.message }, { status: 500 })

  return Response.json({ ok: true })
}
