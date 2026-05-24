import Link from 'next/link'

const FOOTER_LINKS = [
  { href: '/services', label: 'Services' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/about', label: 'About' },
  { href: '/book', label: 'Book a Sweep' },
  { href: '/login', label: 'Customer Login' },
  { href: '/sweepers/apply', label: 'Become a Sweeper' },
] as const

export function Footer(): React.ReactElement {
  return (
    <footer className="border-t border-white/10 bg-shelter">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="font-[family-name:var(--font-bebas)] text-3xl tracking-wide text-white">
              🌪️ STORM SWEEP
            </p>
            <p className="mt-3 max-w-sm font-[family-name:var(--font-barlow-condensed)] text-sm leading-relaxed text-white/60">
              Norman&apos;s underground storm shelter cleaning and upgrade service.
              Clean shelters. Ready families. Safer Oklahoma summers.
            </p>
          </div>

          <div>
            <p className="font-[family-name:var(--font-bebas)] text-lg tracking-wide text-white">
              QUICK LINKS
            </p>
            <ul className="mt-4 space-y-2">
              {FOOTER_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="font-[family-name:var(--font-barlow-condensed)] text-sm text-white/60 transition-colors hover:text-sky-light"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="font-[family-name:var(--font-bebas)] text-lg tracking-wide text-white">
              NORMAN, OKLAHOMA
            </p>
            <p className="mt-4 font-[family-name:var(--font-barlow-condensed)] text-sm leading-relaxed text-white/60">
              Locally owned and operated in Cleveland County. Serving Norman,
              Moore, Noble, and surrounding communities across tornado alley.
            </p>
            <p className="mt-4 font-[family-name:var(--font-barlow-condensed)] text-sm text-white/40">
              Licensed &amp; Insured · stormsweep.com
            </p>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6">
          <p className="text-center font-[family-name:var(--font-barlow-condensed)] text-xs text-white/40">
            © {new Date().getFullYear()} Storm Sweep · Norman, OK · All rights
            reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
