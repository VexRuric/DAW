import { createClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('site_settings')
    .select('key, value')
    .in('key', ['twitch_channel', 'discord_url', 'twitter_url'])
  const map = Object.fromEntries((data ?? []).map((r: { key: string; value: string }) => [r.key, r.value]))
  const twitchChannel = (map.twitch_channel || 'daware').trim()
  return Response.json(
    {
      twitch_url:  `https://twitch.tv/${twitchChannel}`,
      discord_url: map.discord_url  || '',
      twitter_url: map.twitter_url  || '',
    },
    { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=120' } }
  )
}
