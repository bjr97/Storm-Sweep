import { Barlow, Barlow_Condensed, Bebas_Neue } from 'next/font/google'
import Link from 'next/link'

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

export default function SweeperApplyLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>): React.ReactElement {
  return (
    <div
      className={`${bebasNeue.variable} ${barlow.variable} ${barlowCondensed.variable} min-h-screen bg-[#F7F7F4] font-[family-name:var(--font-barlow)] text-foreground`}
    >
      <header className="border-b border-black/10 bg-white">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="font-[family-name:var(--font-bebas)] text-2xl tracking-wide text-shelter"
          >
            🌪️ STORM SWEEP
          </Link>
          <p className="font-[family-name:var(--font-barlow-condensed)] text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
            Sweeper Application
          </p>
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}
