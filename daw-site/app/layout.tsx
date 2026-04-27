import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/lib/auth-context'
import CursorGlow from '@/components/CursorGlow'
import TopBar from '@/components/TopBar'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: {
    default: 'DAW Warehouse LIVE',
    template: '%s | DAW Warehouse LIVE',
  },
  description:
    'The official home of DAW Warehouse LIVE — results, roster, championships, show schedule, and more.',
  keywords: ['DAW Warehouse', 'wrestling federation', 'daware', 'match results', 'roster'],
  openGraph: {
    title: 'DAW Warehouse LIVE',
    description: 'The official home of DAW Warehouse LIVE — results, roster, championships.',
    url: 'https://ruric.gg',
    siteName: 'DAW Warehouse LIVE',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DAW Warehouse LIVE',
    description: 'The official home of DAW Warehouse LIVE.',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <AuthProvider>
          <CursorGlow />
          <div className="stack">
            <TopBar />
            <Nav />
            <main>{children}</main>
            <Footer />
          </div>
        </AuthProvider>
      </body>
    </html>
  )
}
