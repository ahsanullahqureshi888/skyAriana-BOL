import '@/lib/polyfills'
import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { PWARegister } from '@/components/pwa-register'
import { ChunkErrorHandler } from '@/components/chunk-error-handler'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'
import './liquid-workspace.css'

const inter = { variable: 'font-sans' }
const vazirmatn = { variable: 'font-vazirmatn' }
const jetbrainsMono = { variable: 'font-mono' }

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#1e3a8a' },
    { media: '(prefers-color-scheme: dark)', color: '#020617' }
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title: 'AQ COMPANIES - Logistics & BOL Management',
  description: 'AQ COMPANIES — International Transport & Logistics Management System',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'AQ Companies',
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
    <html lang="en" className={`${inter.variable} ${vazirmatn.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning dir="ltr">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
      </head>
      <body className="font-sans antialiased min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: -1 }}>
            <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-sky-200/50 dark:bg-blue-900/10 blur-3xl" />
            <div className="absolute top-1/2 -left-40 h-96 w-96 rounded-full bg-blue-200/40 dark:bg-indigo-900/10 blur-3xl" />
            <div className="absolute -bottom-40 right-1/3 h-80 w-80 rounded-full bg-indigo-200/30 dark:bg-violet-900/10 blur-3xl" />
          </div>
          <PWARegister />
          <ChunkErrorHandler />
          {children}
          {process.env.NODE_ENV === 'production' && <Analytics />}
        </ThemeProvider>
      </body>
    </html>
  )
}
