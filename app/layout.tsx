import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'HavenKey Concierge',
  description: 'Your personal digital concierge for a luxury stay experience.',
  icons: {
    icon: '/favicon.ico',
  },
  // Prevent indexing of guest portals
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,         // Prevent zoom on mobile inputs
  userScalable: false,
  themeColor: '#0A0A0B',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-haven-bg text-haven-text antialiased">
        {children}
      </body>
    </html>
  )
}
