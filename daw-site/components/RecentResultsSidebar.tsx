import { SilhouetteSVG } from './ChampionStrip'

interface MatchResult {
  id: string
  tag: string
  tagColor: string
  title: string
  date: string
  renderUrl?: string
}

const MOCK_RESULTS: MatchResult[] = [
  { id: '1', tag: '#ANDSTILL - Internet Title', tagColor: 'var(--gold)', title: 'ANDO RETAINS', date: '04.17.2026' },
  { id: '2', tag: '#ANDNEW - Tag Title', tagColor: 'var(--accent-red)', title: 'S&S EXPRESS', date: '04.17.2026' },
  { id: '3', tag: 'WINNER - TLC', tagColor: '#a855f7', title: 'TYF STANDS TALL', date: '04.17.2026' },
  { id: '4', tag: 'WINNER - Battle Royale', tagColor: '#a855f7', title: 'PIGPOACHER LAST MAN', date: '04.17.2026' },
]

export default function RecentResultsSidebar() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', color: 'var(--text-strong)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
        RECENT RESULTS
      </h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {MOCK_RESULTS.map((res) => (
          <div 
            key={res.id} 
            style={{ 
              display: 'flex', 
              background: 'var(--surface)', 
              border: '1px solid var(--border)',
              height: '90px',
              overflow: 'hidden'
            }}
          >
            {/* Image Box */}
            <div style={{ width: '90px', height: '90px', position: 'relative', background: 'var(--surface-3)', borderRight: '1px solid var(--border)' }}>
               {/* Purple edge glow */}
              <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(168,85,247,0.2) 0%, transparent 70%)' }} />
              {res.renderUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={res.renderUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', opacity: 0.5 }}><SilhouetteSVG /></div>
              )}
            </div>
            
            {/* Text Content */}
            <div style={{ flex: 1, padding: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.55rem', fontWeight: 700, color: res.tagColor, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                {res.tag}
              </span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'white', textTransform: 'uppercase', lineHeight: 1, marginBottom: '0.3rem' }}>
                {res.title}
              </span>
              <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>
                {res.date}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
