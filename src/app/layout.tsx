import type { Metadata } from 'next'
import {
  Barlow,
  Barlow_Condensed,
  Bebas_Neue,
  Press_Start_2P,
  Space_Mono,
  VT323,
} from 'next/font/google'
import localFont from 'next/font/local'

import { DevThemeToggle } from '@/components/dev/DevThemeToggle'
import { ACTIVE_THEME } from '@/lib/theme'

import './globals.css'

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
})

const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
})

const bebasNeue = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bebas',
})

const barlow = Barlow({
  weight: ['400', '500', '600'],
  subsets: ['latin'],
  variable: '--font-barlow',
})

const barlowCondensed = Barlow_Condensed({
  weight: ['400', '500', '600'],
  subsets: ['latin'],
  variable: '--font-barlow-condensed',
})

const pressStart2P = Press_Start_2P({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-press-start',
})

const vt323 = VT323({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-vt323',
})

const spaceMono = Space_Mono({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-space-mono',
})

export const metadata: Metadata = {
  title: 'Storm Sweep | Underground Storm Shelter Cleaning · Norman, OK',
  description:
    'Professional underground storm shelter cleaning, LED upgrades, and emergency supply kits in Norman, Oklahoma.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>): React.ReactElement {
  return (
    <html lang="en" data-theme={ACTIVE_THEME} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600&family=Barlow:wght@400;500;600&family=Bebas+Neue&family=Press+Start+2P&family=Space+Mono:ital,wght@0,400;0,700;1,400&family=VT323&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${bebasNeue.variable} ${barlow.variable} ${barlowCondensed.variable} ${pressStart2P.variable} ${vt323.variable} ${spaceMono.variable} antialiased`}
        style={{ cursor: 'var(--cursor)' }}
      >
        {children}
        <DevThemeToggle />
      </body>
    </html>
  )
}
