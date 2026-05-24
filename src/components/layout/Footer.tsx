'use client'

import Link from 'next/link'

import { useIsRetro } from '@/hooks/useTheme'

const FOOTER_LINKS = [
  { href: '/services', label: 'Services' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/about', label: 'About' },
  { href: '/book', label: 'Book a Sweep' },
  { href: '/login', label: 'Customer Login' },
  { href: '/sweepers/apply', label: 'Become a Sweeper' },
] as const

function DarkFooter(): React.ReactElement {
  return (
    <footer className="border-t border-white/10 bg-[var(--color-bg)]">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="font-display text-3xl tracking-wide text-[var(--color-text)]">
              🌪️ STORM SWEEP
            </p>
            <p className="mt-3 max-w-sm font-body text-sm leading-relaxed text-[var(--color-text-muted)]">
              Norman&apos;s underground storm shelter cleaning and upgrade service.
              Clean shelters. Ready families. Safer Oklahoma summers.
            </p>
          </div>

          <div>
            <p className="font-display text-lg tracking-wide text-[var(--color-text)]">
              QUICK LINKS
            </p>
            <ul className="mt-4 space-y-2">
              {FOOTER_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="font-body text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-primary-light)]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="font-display text-lg tracking-wide text-[var(--color-text)]">
              NORMAN, OKLAHOMA
            </p>
            <p className="mt-4 font-body text-sm leading-relaxed text-[var(--color-text-muted)]">
              Locally owned and operated in Cleveland County. Serving Norman,
              Moore, Noble, and surrounding communities across tornado alley.
            </p>
            <p className="mt-4 font-body text-sm text-[var(--color-text-muted)]/70">
              Licensed &amp; Insured · stormsweep.com
            </p>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6">
          <p className="text-center font-body text-xs text-[var(--color-text-muted)]/70">
            © {new Date().getFullYear()} Storm Sweep · Norman, OK · All rights
            reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}

function RetroFooter(): React.ReactElement {
  return (
    <footer className="border-t-[3px] border-[var(--color-ink)] bg-[var(--color-accent)]">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
          <div className="pixel-card bg-[var(--color-paper)] p-4">
            <p className="font-display text-[10px] leading-relaxed text-[var(--color-ink)]">
              STORM SWEEP
            </p>
            <p className="mt-3 max-w-sm font-body text-xl leading-snug text-[var(--color-text-muted)]">
              Norman&apos;s #1 underground shelter cleaning service. Clean
              shelters. Ready families.
            </p>
          </div>

          <div className="pixel-card bg-[var(--color-paper)] p-4">
            <p className="font-display text-[8px] text-[var(--color-ink)]">LINKS</p>
            <ul className="mt-4 space-y-2">
              {FOOTER_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="font-body text-xl text-[var(--color-ink)] transition-colors hover:text-[var(--color-primary)]"
                  >
                    &gt; {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="pixel-card bg-[var(--color-paper)] p-4">
            <p className="font-display text-[8px] text-[var(--color-ink)]">
              NORMAN OK
            </p>
            <p className="mt-4 font-body text-xl leading-snug text-[var(--color-text-muted)]">
              Locally owned in Cleveland County. Serving Norman, Moore, Noble,
              and tornado alley.
            </p>
            <p className="mt-4 font-body text-lg text-[var(--color-text-muted)]">
              Licensed &amp; Insured · stormsweep.com
            </p>
          </div>
        </div>

        <div className="mt-10 border-t-[3px] border-[var(--color-ink)] pt-6">
          <p className="text-center font-body text-lg text-[var(--color-ink)]">
            © {new Date().getFullYear()} STORM SWEEP · NORMAN OK
          </p>
        </div>
      </div>
    </footer>
  )
}

export function Footer(): React.ReactElement {
  const isRetro = useIsRetro()
  return isRetro ? <RetroFooter /> : <DarkFooter />
}
