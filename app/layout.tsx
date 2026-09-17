import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { PWARegister } from '@/components/pwa-register'
import { ChunkErrorHandler } from '@/components/chunk-error-handler'
import './globals.css'

const inter = { variable: 'font-sans' }
const vazirmatn = { variable: 'font-vazirmatn' }
const jetbrainsMono = { variable: 'font-mono' }

export const viewport: Viewport = {
  themeColor: '#1e3a8a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title: 'SKY ARIANA LIMITED',
  description: 'SKY ARIANA LIMITED — International Transport & Logistics Management System',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Sky Ariana',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        url: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
      { url: '/apple-icon.png', type: 'image/png' },
    ],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`bg-background ${inter.variable} ${vazirmatn.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-100" suppressHydrationWarning>
        <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: -1 }}>
          <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-sky-200/50 blur-3xl" />
          <div className="absolute top-1/2 -left-40 h-96 w-96 rounded-full bg-blue-200/40 blur-3xl" />
          <div className="absolute -bottom-40 right-1/3 h-80 w-80 rounded-full bg-indigo-200/30 blur-3xl" />
        </div>
        <PWARegister />
        <ChunkErrorHandler />
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
        {process.env.NODE_ENV === 'production' && <SpeedInsights />}
      </body>
    </html>
  )
}
