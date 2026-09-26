'use client'

// Shared, de-duplicated client fetches for data several components need on the
// same page (TopBar, Footer, HomeCommunityStrip, HomeStreamSection). The first
// caller starts the request; everyone else awaits the same promise.

export interface SocialLinks { twitch_url: string; discord_url: string; twitter_url: string }
export interface StreamStatus { live: boolean; channel: string; title: string | null }

const cache = new Map<string, { at: number; promise: Promise<unknown> }>()

function cachedJson<T>(url: string, maxAgeMs: number, fallback: T): Promise<T> {
  const hit = cache.get(url)
  if (hit && Date.now() - hit.at < maxAgeMs) return hit.promise as Promise<T>
  const promise = fetch(url).then(r => r.json() as Promise<T>).catch(() => {
    cache.delete(url) // let the next caller retry
    return fallback
  })
  cache.set(url, { at: Date.now(), promise })
  return promise
}

export function getSocialLinks(): Promise<SocialLinks> {
  return cachedJson('/api/social-links', 5 * 60_000, { twitch_url: '', discord_url: '', twitter_url: '' })
}

export function getStreamStatus(): Promise<StreamStatus> {
  return cachedJson('/api/stream-status', 30_000, { live: false, channel: '', title: null })
}
