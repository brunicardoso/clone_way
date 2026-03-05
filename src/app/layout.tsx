import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { MagicBarProvider } from '@/components/magic-bar/MagicBarProvider'
import { MagicBar } from '@/components/magic-bar/MagicBar'
import { AppShell } from '@/components/layout/AppShell'
import { KeyboardShortcutHandler } from './KeyboardShortcutHandler'
import { Analytics } from '@vercel/analytics/react'

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  display: 'swap',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title: 'CloneWay - Molecular Biology Suite',
  description:
    'An open-source, GUI-first molecular biology suite for sequence design and analysis.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <MagicBarProvider>
          <KeyboardShortcutHandler />
          <MagicBar />
          <AppShell>{children}</AppShell>
        </MagicBarProvider>
        <Analytics />
      </body>
    </html>
  )
}

