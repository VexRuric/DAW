import { createClient } from '@/lib/supabase-server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const targetType = formData.get('targetType') as string | null
  const targetId = formData.get('targetId') as string | null

  if (!file || !targetType || !targetId) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (!['wrestlers', 'teams'].includes(targetType)) {
    return Response.json({ error: 'Invalid targetType' }, { status: 400 })
  }

  // Verify the user owns this wrestler/team
  const { data: row } = await supabase.from(targetType).select('submitted_by').eq('id', targetId).single()
  if (!row || row.submitted_by !== user.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return Response.json({ error: 'Service key not configured' }, { status: 500 })
  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)

  const folder = targetType === 'wrestlers' ? 'wrestlers' : 'factions'
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `${folder}/${targetId}.${ext}`

  const bytes = await file.arrayBuffer()
  const { error: uploadErr } = await admin.storage.from('renders').upload(path, bytes, { upsert: true, contentType: file.type })
  if (uploadErr) return Response.json({ error: uploadErr.message }, { status: 500 })

  const { data: { publicUrl } } = admin.storage.from('renders').getPublicUrl(path)
  const { error: updateErr } = await admin.from(targetType).update({ render_url: publicUrl }).eq('id', targetId)
  if (updateErr) return Response.json({ error: updateErr.message }, { status: 500 })

  return Response.json({ publicUrl })
}
