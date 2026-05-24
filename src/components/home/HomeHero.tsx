import Link from 'next/link'

import { buttonVariants } from '@/components/ui/button'
import { cn, formatCurrency, PRICING } from '@/lib/utils'

export function DarkHero(): React.ReactElement {
  return (
    <section className="relative overflow-hidden border-b border-white/10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(46,134,193,0.18),transparent_55%)]" />
      <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <p className="font-body text-sm font-semibold uppercase tracking-[0.2em] text-[var(--color-primary-light)]">
          Norman, Oklahoma · Underground Shelter Specialists
        </p>
        <h1 className="mt-4 max-w-3xl font-display text-5xl leading-none tracking-wide text-[var(--color-text)] sm:text-6xl lg:text-7xl">
          Your Storm Shelter.
          <br />
          <span className="text-[var(--color-primary)]">Clean.</span> Ready. Safe.
        </h1>
        <p className="mt-6 max-w-xl font-body text-lg leading-relaxed text-[var(--color-text-muted)]">
          Professional cleaning, lighting upgrades, and emergency supply kits
          for underground storm shelters across the Norman metro.
        </p>
        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <Link
            href="/book"
            className={cn(
              buttonVariants({ size: 'lg' }),
              'h-12 bg-[var(--color-primary)] px-8 text-base font-semibold uppercase tracking-wide text-white hover:opacity-90'
            )}
          >
            Book a Sweep
          </Link>
          <Link
            href="/pricing"
            className={cn(
              buttonVariants({ size: 'lg', variant: 'outline' }),
              'h-12 border-[var(--color-accent)] bg-transparent px-8 text-base font-semibold uppercase tracking-wide text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10'
            )}
          >
            Storm Ready Membership
          </Link>
        </div>
      </div>
    </section>
  )
}

export function RetroHero(): React.ReactElement {
  return (
    <section className="relative overflow-hidden border-b-[3px] border-[var(--color-ink)]">
      <div className="dither-bg pointer-events-none absolute inset-0 opacity-[0.12]" />
      <div className="relative mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:gap-12 lg:px-8 lg:py-16">
        <div>
          <h1 className="font-display text-xl leading-relaxed tracking-wide sm:text-2xl lg:text-3xl">
            <span className="text-[var(--color-primary)]">CLEAN.</span>{' '}
            <span className="text-[var(--color-accent)]">SAFE.</span>{' '}
            <span className="text-[var(--color-primary)]">READY.</span>
            <span className="animate-blink-cursor ml-1 inline-block h-[1em] w-[0.5em] bg-[var(--color-ink)] align-middle" />
          </h1>
          <p className="mt-4 font-body text-2xl text-[var(--color-text-muted)]">
            {'// UNDERGROUND SHELTER SERVICES //'}
          </p>
          <p className="mt-4 max-w-md font-body text-xl leading-snug text-[var(--color-text)]">
            Professional cleaning, lighting upgrades, and emergency supply kits
            for underground storm shelters across the Norman metro.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/book"
              className="pixel-btn bg-[var(--color-primary)] px-6 py-3 text-center font-body text-xl uppercase text-[var(--color-paper)]"
            >
              Book a Sweep
            </Link>
            <Link
              href="/pricing"
              className="pixel-btn bg-[var(--color-accent)] px-6 py-3 text-center font-body text-xl uppercase text-[var(--color-ink)]"
            >
              Storm Ready
            </Link>
          </div>
          <div className="mt-10 flex flex-wrap gap-6">
            <div>
              <p className="font-display text-sm text-[var(--color-primary)]">
                {formatCurrency(PRICING.shelter.standard)}
              </p>
              <p className="font-body text-lg text-[var(--color-text-muted)]">FROM</p>
            </div>
            <div>
              <p className="font-display text-sm text-[var(--color-accent-dark,var(--color-accent))]">
                SAME WK
              </p>
              <p className="font-body text-lg text-[var(--color-text-muted)]">BOOKING</p>
            </div>
            <div>
              <p className="font-display text-sm text-[var(--color-primary)]">100%</p>
              <p className="font-body text-lg text-[var(--color-text-muted)]">PHOTO PROOF</p>
            </div>
          </div>
        </div>

        <div className="bg-[var(--color-primary)] p-4 lg:p-6">
          <div className="pixel-card bg-[var(--color-paper)]">
            <div className="flex items-center gap-2 border-b-[3px] border-[var(--color-ink)] bg-[var(--color-tan)] px-3 py-2">
              <span className="size-3 border-2 border-[var(--color-ink)] bg-[var(--color-danger)]" />
              <span className="size-3 border-2 border-[var(--color-ink)] bg-[var(--color-accent)]" />
              <span className="size-3 border-2 border-[var(--color-ink)] bg-[var(--color-primary)]" />
              <span className="ml-2 font-body text-lg text-[var(--color-ink)]">
                BEFORE / AFTER.exe
              </span>
            </div>
            <div className="relative grid grid-cols-2 gap-0">
              <div className="border-r-[3px] border-[var(--color-ink)] bg-[var(--color-surface)] p-4">
                <p className="font-body text-lg uppercase text-[var(--color-text-muted)]">
                  Before
                </p>
                <div className="mt-2 aspect-square bg-[color-mix(in_srgb,var(--color-ink)_15%,var(--color-paper))]" />
              </div>
              <div className="bg-[var(--color-surface)] p-4">
                <p className="font-body text-lg uppercase text-[var(--color-text-muted)]">
                  After
                </p>
                <div className="mt-2 aspect-square bg-[color-mix(in_srgb,var(--color-primary)_25%,var(--color-paper))]" />
              </div>
              <span className="absolute right-3 top-3 bg-[var(--color-danger)] px-2 py-1 font-display text-[8px] text-[var(--color-paper)]">
                FREE KIT
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
