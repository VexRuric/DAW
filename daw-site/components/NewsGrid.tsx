export default function NewsGrid() {
  return (
    <div style={{ marginTop: '3rem' }}>
      {/* Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', color: 'var(--text-strong)', textTransform: 'uppercase', lineHeight: 1 }}>
          NEWS & MATCH REPORTS
        </h2>
        
        {/* Filters */}
        <div style={{ display: 'flex', border: '1px solid var(--border)', background: 'var(--surface)' }}>
          <button style={{ padding: '0.6rem 1.2rem', fontFamily: 'var(--font-meta)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', background: 'var(--purple)', color: 'white', border: 'none', cursor: 'none' }}>
            LATEST
          </button>
          <button style={{ padding: '0.6rem 1.2rem', fontFamily: 'var(--font-meta)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', background: 'transparent', color: 'var(--text-dim)', border: 'none', borderLeft: '1px solid var(--border)', cursor: 'none' }}>
            MATCH WINNERS
          </button>
          <button style={{ padding: '0.6rem 1.2rem', fontFamily: 'var(--font-meta)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', background: 'transparent', color: 'var(--text-dim)', border: 'none', borderLeft: '1px solid var(--border)', cursor: 'none' }}>
            ANNOUNCEMENTS
          </button>
        </div>
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
        {/* Card 1 */}
        <div style={{ aspectRatio: '16/9', background: 'radial-gradient(ellipse at center, rgba(168,85,247,0.2) 0%, #111116 100%)', border: '1px solid var(--border)', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '1rem', left: '1rem', background: 'var(--accent-red)', color: 'white', fontFamily: 'var(--font-display)', fontSize: '1rem', padding: '0.2rem 0.5rem', lineHeight: 1 }}>
            #ANDNEW
          </div>
        </div>

        {/* Card 2 */}
        <div style={{ aspectRatio: '16/9', background: 'radial-gradient(ellipse at center, rgba(168,85,247,0.2) 0%, #111116 100%)', border: '1px solid var(--border)', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '1rem', left: '1rem', background: 'var(--gold)', color: 'var(--bg-top)', fontFamily: 'var(--font-display)', fontSize: '1rem', padding: '0.2rem 0.5rem', lineHeight: 1 }}>
            #ANDSTILL
          </div>
        </div>

        {/* Card 3 */}
        <div style={{ aspectRatio: '16/9', background: 'radial-gradient(ellipse at center, rgba(168,85,247,0.2) 0%, #111116 100%)', border: '1px solid var(--border)', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '1rem', left: '1rem', background: 'var(--accent-red)', color: 'white', fontFamily: 'var(--font-display)', fontSize: '1rem', padding: '0.2rem 0.5rem', lineHeight: 1 }}>
            #ANDNEW
          </div>
        </div>
      </div>
    </div>
  )
}
