'use client'

import { Menu, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

import { buttonVariants } from '@/components/ui/button'
import { useIsRetro } from '@/hooks/useTheme'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { href: '/services', label: 'Services' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/about', label: 'About' },
] as const

const TICKER_TEXT =
  "★ STORM SWEEP IS OPEN ★ NORMAN OK'S #1 SHELTER CLEANING SERVICE ★ BOOK NOW ★ FREE EMERGENCY KIT WITH FIRST SWEEP ★"

function DarkNavbar(): React.ReactElement {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[var(--color-bg)]/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="font-display text-2xl tracking-wide text-[var(--color-text)]"
          onClick={() => setMobileOpen(false)}
        >
          🌪️ STORM SWEEP
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'font-body text-sm font-medium uppercase tracking-wide transition-colors hover:text-[var(--color-primary-light)]',
                pathname === link.href
                  ? 'text-[var(--color-primary)]'
                  : 'text-[var(--color-text)]/80'
              )}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/book"
            className={cn(
              buttonVariants({ size: 'lg' }),
              'h-9 bg-[var(--color-primary)] px-5 text-sm font-semibold uppercase tracking-wide text-white hover:opacity-90'
            )}
          >
            Book Now
          </Link>
        </nav>

        <button
          type="button"
          className="inline-flex items-center justify-center rounded-lg p-2 text-[var(--color-text)] md:hidden"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((open) => !open)}
        >
          {mobileOpen ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>

      {mobileOpen ? (
        <nav className="border-t border-white/10 bg-[var(--color-bg)] px-4 py-4 md:hidden">
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'rounded-lg px-3 py-2 font-body text-base font-medium uppercase tracking-wide transition-colors hover:bg-white/5',
                  pathname === link.href
                    ? 'text-[var(--color-primary)]'
                    : 'text-[var(--color-text)]/90'
                )}
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/book"
              className="mt-2 rounded-lg bg-[var(--color-primary)] px-3 py-3 text-center font-body text-base font-semibold uppercase tracking-wide text-white hover:opacity-90"
              onClick={() => setMobileOpen(false)}
            >
              Book Now
            </Link>
          </div>
        </nav>
      ) : null}
    </header>
  )
}

function RetroNavbar(): React.ReactElement {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50">
      <div className="overflow-hidden border-b-[3px] border-[var(--color-ink)] bg-[var(--color-primary)] py-1">
        <div className="animate-marquee flex whitespace-nowrap font-body text-lg text-[var(--color-paper)]">
          <span className="mx-4">{TICKER_TEXT}</span>
          <span className="mx-4">{TICKER_TEXT}</span>
        </div>
      </div>

      <div className="border-b-[3px] border-[var(--color-ink)] bg-[var(--color-accent)]">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="font-display text-[10px] leading-relaxed tracking-wide text-[var(--color-ink)] sm:text-xs"
            onClick={() => setMobileOpen(false)}
          >
            STORM SWEEP
          </Link>

          <nav className="hidden items-center gap-4 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'pixel-nav-link px-2 py-1 font-body text-xl uppercase tracking-wide',
                  pathname === link.href
                    ? 'bg-[var(--color-primary)] text-[var(--color-paper)]'
                    : 'text-[var(--color-ink)]'
                )}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/book"
              className="pixel-btn bg-[var(--color-danger)] px-4 py-2 font-body text-xl uppercase tracking-wide text-[var(--color-paper)]"
            >
              Book Now
            </Link>
          </nav>

          <button
            type="button"
            className="inline-flex items-center justify-center p-2 text-[var(--color-ink)] md:hidden"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>

        {mobileOpen ? (
          <nav className="border-t-[3px] border-[var(--color-ink)] px-4 py-4 md:hidden">
            <div className="flex flex-col gap-2">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'pixel-nav-link px-3 py-2 font-body text-xl uppercase',
                    pathname === link.href
                      ? 'bg-[var(--color-primary)] text-[var(--color-paper)]'
                      : 'text-[var(--color-ink)]'
                  )}
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/book"
                className="pixel-btn mt-2 bg-[var(--color-danger)] px-3 py-3 text-center font-body text-xl uppercase text-[var(--color-paper)]"
                onClick={() => setMobileOpen(false)}
              >
                Book Now
              </Link>
            </div>
          </nav>
        ) : null}
      </div>
    </header>
  )
}

export function Navbar(): React.ReactElement {
  const isRetro = useIsRetro()
  return isRetro ? <RetroNavbar /> : <DarkNavbar />
}
