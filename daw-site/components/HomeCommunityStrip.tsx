'use client'

import { useEffect, useState } from 'react'

export default function HomeCommunityStrip() {
  const [twitchUrl, setTwitchUrl]   = useState('https://twitch.tv/daware')
  const [discordUrl, setDiscordUrl] = useState('')
  const [twitterUrl, setTwitterUrl] = useState('')

  useEffect(() => {
    fetch('/api/social-links')
      .then(r => r.json())
      .then(d => {
        if (d.twitch_url)  setTwitchUrl(d.twitch_url)
        if (d.discord_url) setDiscordUrl(d.discord_url)
        if (d.twitter_url) setTwitterUrl(d.twitter_url)
      })
      .catch(() => {})
  }, [])

  return (
    <section className="home-section" style={{ borderTop: '1px solid var(--border)' }}>
      <div style={{ marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
        <h2 className="community-heading" style={{ fontFamily: 'var(--font-display)', fontSize: '2.75rem', color: 'var(--text-strong)', letterSpacing: '0.01em', textTransform: 'uppercase', lineHeight: 1 }}>
          Join The Community
        </h2>
      </div>

      <div className="community-grid">
        <a
          href={twitchUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ padding: '2rem', background: 'var(--surface)', border: '1px solid var(--border)', textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', gap: '0.5rem', transition: 'all .2s' }}
        >
          <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.7rem', letterSpacing: '0.2em', color: 'var(--purple-hot)', fontWeight: 700, textTransform: 'uppercase' }}>Twitch</span>
          <span className="community-card-heading" style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', lineHeight: 1, color: 'var(--text-strong)', textTransform: 'uppercase', letterSpacing: '0.01em' }}>Watch Live</span>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Live every Thursday at 9PM ET. Subscribe on Twitch for exclusive content and alerts.
          </p>
          <span className="community-card-link" style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--purple-hot)', marginTop: '1rem', letterSpacing: '0.1em' }}>
            {twitchUrl.replace('https://', '')} →
          </span>
        </a>

        <a
          href={discordUrl || undefined}
          target={discordUrl ? '_blank' : undefined}
          rel={discordUrl ? 'noopener noreferrer' : undefined}
          style={{ padding: '2rem', background: 'var(--surface)', border: '1px solid var(--border)', textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', gap: '0.5rem', transition: 'all .2s', opacity: discordUrl ? 1 : 0.5, cursor: discordUrl ? 'pointer' : 'default' }}
        >
          <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.7rem', letterSpacing: '0.2em', color: 'var(--purple-hot)', fontWeight: 700, textTransform: 'uppercase' }}>Discord</span>
          <span className="community-card-heading" style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', lineHeight: 1, color: 'var(--text-strong)', textTransform: 'uppercase', letterSpacing: '0.01em' }}>The Locker Room</span>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Discuss shows, vote on match outcomes, and connect with the DAW universe.
          </p>
          <span className="community-card-link" style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--purple-hot)', marginTop: '1rem', letterSpacing: '0.1em' }}>
            {discordUrl ? `${discordUrl.replace('https://', '')} →` : 'Coming Soon'}
          </span>
        </a>

        <a
          href={twitterUrl || undefined}
          target={twitterUrl ? '_blank' : undefined}
          rel={twitterUrl ? 'noopener noreferrer' : undefined}
          style={{ padding: '2rem', background: 'var(--surface)', border: '1px solid var(--border)', textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', gap: '0.5rem', transition: 'all .2s', opacity: twitterUrl ? 1 : 0.5, cursor: twitterUrl ? 'pointer' : 'default' }}
        >
          <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.7rem', letterSpacing: '0.2em', color: 'var(--purple-hot)', fontWeight: 700, textTransform: 'uppercase' }}>Twitter / X</span>
          <span className="community-card-heading" style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', lineHeight: 1, color: 'var(--text-strong)', textTransform: 'uppercase', letterSpacing: '0.01em' }}>Follow The Story</span>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Real-time results, announcements, and behind-the-scenes from DAW Warehouse LIVE.
          </p>
          <span className="community-card-link" style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--purple-hot)', marginTop: '1rem', letterSpacing: '0.1em' }}>
            {twitterUrl ? `${twitterUrl.replace('https://', '')} →` : 'Coming Soon'}
          </span>
        </a>
      </div>
    </section>
  )
}
