import { createClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// In-process token cache — avoids a new OAuth round-trip on every poll
let cachedToken: { token: string; exp: number } | null = null

async function getAccessToken(clientId: string, secret: string): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.exp - 60_000) return cachedToken.token
  const r = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${secret}&grant_type=client_credentials`,
    { method: 'POST' }
  )
  const j = await r.json()
  cachedToken = { token: j.access_token as string, exp: Date.now() + (j.expires_in as number) * 1000 }
  return cachedToken.token
}

export async function GET() {
  const supabase = await createClient()
  const { data: setting } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'twitch_channel')
    .single()

  const channel = setting?.value?.trim() || 'daware'

  const clientId = process.env.TWITCH_CLIENT_ID
  const secret   = process.env.TWITCH_CLIENT_SECRET

  if (!clientId || !secret) {
    return Response.json({ live: false, channel })
  }

  try {
    const token = await getAccessToken(clientId, secret)
    const r = await fetch(
      `https://api.twitch.tv/helix/streams?user_login=${encodeURIComponent(channel)}`,
      { headers: { 'Client-ID': clientId, Authorization: `Bearer ${token}` } }
    )
    const body = await r.json()
    const live = Array.isArray(body.data) && body.data.length > 0
    return Response.json(
      { live, channel },
      { headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=60' } }
    )
  } catch {
    return Response.json({ live: false, channel })
  }
}
