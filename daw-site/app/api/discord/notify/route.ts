import { createClient } from '@/lib/supabase-server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const DISCORD_API = 'https://discord.com/api/v10'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = user.app_metadata?.role
  if (role !== 'admin' && role !== 'creative') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const botToken = process.env.DISCORD_BOT_TOKEN
  if (!botToken) return NextResponse.json({ error: 'DISCORD_BOT_TOKEN not configured' }, { status: 503 })

  const { type, title, body, userIds } = await req.json()
  if (!type || !title) return NextResponse.json({ error: 'type and title required' }, { status: 400 })

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Find users who have this discord alert type enabled
  const { data: prefs } = await admin
    .from('user_alert_prefs')
    .select('id')
    .eq(`discord_${type}`, true)

  const eligibleIds = userIds
    ? (prefs ?? []).filter(p => userIds.includes(p.id)).map((p: { id: string }) => p.id)
    : (prefs ?? []).map((p: { id: string }) => p.id)

  if (eligibleIds.length === 0) return NextResponse.json({ ok: true, sent: 0 })

  const { data: profiles } = await admin
    .from('user_profiles')
    .select('id, discord_id')
    .in('id', eligibleIds)
    .not('discord_id', 'is', null)

  let sent = 0
  for (const p of profiles ?? []) {
    if (!p.discord_id) continue
    try {
      const dmRes = await fetch(`${DISCORD_API}/users/@me/channels`, {
        method: 'POST',
        headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient_id: p.discord_id }),
      })
      if (!dmRes.ok) continue
      const dm = await dmRes.json()
      const msgRes = await fetch(`${DISCORD_API}/channels/${dm.id}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{
            title,
            description: body || undefined,
            color: 0x8000da,
            footer: { text: 'DAW Warehouse LIVE' },
          }],
        }),
      })
      if (msgRes.ok) sent++
    } catch { /* skip failed DMs */ }
  }

  return NextResponse.json({ ok: true, sent })
}
