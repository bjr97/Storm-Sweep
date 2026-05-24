'use client'

import { Menu, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { href: '/services', label: 'Services' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/about', label: 'About' },
] as const

export function Navbar(): React.ReactElement {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-shelter/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="font-[family-name:var(--font-bebas)] text-2xl tracking-wide text-white"
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
                'font-[family-name:var(--font-barlow-condensed)] text-sm font-medium uppercase tracking-wide transition-colors hover:text-sky-light',
                pathname === link.href ? 'text-sky-DEFAULT' : 'text-white/80'
              )}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/book"
            className={cn(
              buttonVariants({ size: 'lg' }),
              'h-9 bg-sky-DEFAULT px-5 text-sm font-semibold uppercase tracking-wide text-white hover:bg-sky-dark'
            )}
          >
            Book Now
          </Link>
        </nav>

        <button
          type="button"
          className="inline-flex items-center justify-center rounded-lg p-2 text-white md:hidden"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((open) => !open)}
        >
          {mobileOpen ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>

      {mobileOpen ? (
        <nav className="border-t border-white/10 bg-shelter px-4 py-4 md:hidden">
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'rounded-lg px-3 py-2 font-[family-name:var(--font-barlow-condensed)] text-base font-medium uppercase tracking-wide transition-colors hover:bg-white/5',
                  pathname === link.href ? 'text-sky-DEFAULT' : 'text-white/90'
                )}
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/book"
              className="mt-2 rounded-lg bg-sky-DEFAULT px-3 py-3 text-center font-[family-name:var(--font-barlow-condensed)] text-base font-semibold uppercase tracking-wide text-white hover:bg-sky-dark"
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
