import Link from 'next/link'
import { SilhouetteSVG } from './ChampionStrip'

export default function FeaturedMatch() {
  return (
    <div style={{ position: 'relative', background: '#250f3d', border: '1px solid var(--border)', aspectRatio: '16/9', overflow: 'hidden' }}>
      {/* Background image replacement */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 50%, rgba(128,0,218,0.3) 0%, #111116 100%)' }} />
      
      {/* Subject placeholder */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '40%', height: '80%', opacity: 0.8 }}>
          <SilhouetteSVG />
        </div>
      </div>

      {/* Top Tag */}
      <div style={{ position: 'absolute', top: '1.5rem', left: '1.5rem', zIndex: 10 }}>
        <span style={{ 
          background: 'var(--accent-red)', 
          color: 'white', 
          fontFamily: 'var(--font-display)', 
          fontSize: '1.25rem', 
          padding: '0.2rem 0.5rem',
          lineHeight: 1
        }}>
          #ANDNEW
        </span>
      </div>

      {/* Bottom Info */}
      <div style={{ 
        position: 'absolute', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, transparent 100%)',
        padding: '3rem 1.5rem 1.5rem',
        zIndex: 10
      }}>
        <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.65rem', color: 'var(--text-dim)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
          DAW 04-17-2026 · MAIN EVENT
        </p>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 4vw, 3.5rem)', color: 'white', textTransform: 'uppercase', lineHeight: 1, marginBottom: '1rem', maxWidth: '80%' }}>
          MEEKS CAPTURES THE HARDCORE TITLE
        </h2>
        <Link href="/news/meeks-hardcore" className="btn btn-primary" style={{ padding: '0.6rem 1.25rem', fontSize: '0.75rem' }}>
          READ FULL MATCH →
        </Link>
      </div>
    </div>
  )
}
