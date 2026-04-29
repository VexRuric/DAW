import { createClient } from '@/lib/supabase-server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const role = (user.app_metadata as Record<string, unknown>)?.role
  if (role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return Response.json({ error: 'Missing file' }, { status: 400 })

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return Response.json({ error: 'Service key not configured' }, { status: 500 })
  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `site/title_image.${ext}`

  const bytes = await file.arrayBuffer()
  const { error: uploadErr } = await admin.storage
    .from('renders')
    .upload(path, bytes, { upsert: true, contentType: file.type })
  if (uploadErr) return Response.json({ error: uploadErr.message }, { status: 500 })

  const { data: { publicUrl } } = admin.storage.from('renders').getPublicUrl(path)
  await admin.from('site_settings').upsert({ key: 'title_image_url', value: publicUrl })

  return Response.json({ publicUrl })
}
