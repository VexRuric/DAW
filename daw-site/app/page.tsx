import FeaturedMatch from '@/components/FeaturedMatch'
import RecentResultsSidebar from '@/components/RecentResultsSidebar'
import NewsGrid from '@/components/NewsGrid'

export const metadata = {
  title: 'DAW Warehouse LIVE — Home',
  description: 'Results, roster, championships, and upcoming shows for DAW Warehouse LIVE.',
}

export default function HomePage() {
  return (
    <>
      <div style={{ padding: '0 3rem', maxWidth: 1800, margin: '0 auto', width: '100%' }}>
        {/* Top Grid: Hero Video + Recent Results */}
        <section style={{ 
          display: 'grid', 
          gridTemplateColumns: 'minmax(0, 2fr) minmax(280px, 1fr)', 
          gap: '2rem', 
          marginTop: '2rem' 
        }}>
          {/* Left Column: Video */}
          <FeaturedMatch />
          
          {/* Right Column: Recent Results */}
          <RecentResultsSidebar />
        </section>

        {/* Bottom Section: News & Match Reports */}
        <section style={{ paddingBottom: '4rem' }}>
          <NewsGrid />
        </section>
      </div>
    </>
  )
}
