import { createClient } from '@/lib/supabase-server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { suggestion_id, message, from_admin } = body as { suggestion_id?: string; message?: string; from_admin?: boolean }
  if (!suggestion_id || !message?.trim()) return Response.json({ error: 'Missing fields' }, { status: 400 })

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return Response.json({ error: 'Server misconfigured' }, { status: 500 })
  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)

  const { data: profile } = await admin.from('profiles').select('display_name').eq('id', user.id).single()
  const displayName = profile?.display_name ?? 'Unknown'

  if (from_admin) {
    const role = (user.app_metadata as Record<string, unknown>)?.role
    if (!['admin', 'creative', 'writer'].includes(role as string)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }
  } else {
    const { data: suggestion } = await admin
      .from('story_suggestions')
      .select('submitted_by, status')
      .eq('id', suggestion_id)
      .single()
    if (!suggestion) return Response.json({ error: 'Not found' }, { status: 404 })
    if (suggestion.submitted_by !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 })
    if (suggestion.status !== 'acknowledged') return Response.json({ error: 'Not open for chat' }, { status: 400 })
  }

  const { error } = await admin.from('suggestion_messages').insert({
    suggestion_id,
    user_id: user.id,
    display_name: displayName,
    message: message.trim(),
  })
  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ ok: true })
}
