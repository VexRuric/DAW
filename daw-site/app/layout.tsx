import type { Metadata } from 'next'
import { Anton, Archivo, Bebas_Neue, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/lib/auth-context'
import CursorGlow from '@/components/CursorGlow'
import TopBar from '@/components/TopBar'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'

// Self-hosted at build time — no render-blocking request to Google Fonts
const anton     = Anton({ weight: '400', subsets: ['latin'], display: 'swap', variable: '--ff-anton' })
const bebas     = Bebas_Neue({ weight: '400', subsets: ['latin'], display: 'swap', variable: '--ff-bebas' })
const jetbrains = JetBrains_Mono({ weight: ['400', '700'], subsets: ['latin'], display: 'swap', variable: '--ff-mono' })
const archivo   = Archivo({ weight: ['400', '500', '600', '700', '800', '900'], subsets: ['latin'], display: 'swap', variable: '--ff-archivo' })

export const metadata: Metadata = {
  metadataBase: new URL('https://daw.wtf'),
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
    url: 'https://daw.wtf',
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
    <html lang="en" className={`${anton.variable} ${bebas.variable} ${jetbrains.variable} ${archivo.variable}`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
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
