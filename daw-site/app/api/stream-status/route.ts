import { createClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: setting } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'twitch_channel')
    .single()

  const channel = setting?.value?.trim() || 'daware'

  const clientId = process.env.TWITCH_CLIENT_ID
  const clientSecret = process.env.TWITCH_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return Response.json({ live: false, channel })
  }

  try {
    const tokenRes = await fetch(
      `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`,
      { method: 'POST' }
    )
    const { access_token } = await tokenRes.json()

    const streamRes = await fetch(
      `https://api.twitch.tv/helix/streams?user_login=${encodeURIComponent(channel)}`,
      { headers: { 'Client-ID': clientId, Authorization: `Bearer ${access_token}` } }
    )
    const body = await streamRes.json()
    const live = Array.isArray(body.data) && body.data.length > 0
    return Response.json({ live, channel })
  } catch {
    return Response.json({ live: false, channel })
  }
}
