import type { Metadata } from 'next'
import {
  Heart,
  MapPin,
  ShieldCheck,
  Target,
  Tornado,
} from 'lucide-react'
import Link from 'next/link'

import { buttonVariants } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'

const LOCAL_STATS = [
  {
    value: '120K+',
    label: 'Norman residents',
    description: 'Many homes here rely on an in-ground garage shelter',
  },
  {
    value: 'OK',
    label: 'Tornado Alley',
    description: 'Oklahoma sits in the heart of Tornado Alley — spring storms are a fact of life',
  },
  {
    value: 'Your date',
    label: 'Scheduling',
    description: 'Pick your preferred date when you book — we confirm by text',
  },
  {
    value: '2×',
    label: 'Annual visits',
    description: 'Storm Ready members stay prepared year-round',
  },
] as const

const WHY_STORM_SWEEP = [
  {
    icon: MapPin,
    title: 'Built for Norman',
    description:
      'We know Oklahoma shelters — hatch doors, garage floors, humidity, and the mold that comes with it. Local Sweepers, local knowledge.',
  },
  {
    icon: ShieldCheck,
    title: 'Photo-Verified Every Visit',
    description:
      'Before-and-after photos on every job. You see exactly what was done, even the parts you did not watch.',
  },
  {
    icon: Tornado,
    title: 'Storm Season Ready',
    description:
      'Priority scheduling for Storm Ready members before the sirens sound. Your shelter should never be an afterthought.',
  },
  {
    icon: Heart,
    title: 'Family-First Approach',
    description:
      'From baby-proofing supply kits to bright LED lighting, we design every service around keeping Oklahoma families safe underground.',
  },
] as const

export const metadata: Metadata = {
  title: 'About Storm Sweep',
  description:
    'A Norman, Oklahoma service that cleans, lights and stocks underground storm shelters so families are ready before storm season.',
  alternates: { canonical: '/about' },
}

export default function AboutPage(): React.ReactElement {
  return (
    <>
      <section className="relative overflow-hidden border-b border-[color-mix(in_srgb,var(--color-border)_40%,transparent)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(46,134,193,0.18),transparent_55%)]" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <p className="font-body text-sm font-semibold uppercase tracking-[0.2em] text-[var(--color-primary-light)]">
            Norman, Oklahoma
          </p>
          <h1 className="mt-4 max-w-3xl font-display text-5xl leading-none tracking-wide text-[var(--color-text)] sm:text-6xl">
            ROOTED IN
            <br />
            <span className="text-[var(--color-primary)]">TORNADO ALLEY.</span>
          </h1>
          <p className="mt-6 max-w-2xl font-body text-lg leading-relaxed text-[var(--color-text-muted)]">
            Storm Sweep was founded to solve a problem every Norman homeowner
            knows: underground storm shelters get neglected until the sky turns
            green — and by then it is too late.
          </p>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="font-display text-4xl tracking-wide text-[var(--color-text)] sm:text-5xl">
                OUR STORY
              </h2>
              <div className="mt-6 space-y-4 font-body text-base leading-relaxed text-[var(--color-text)]/70">
                <p>
                  Norman sits at the heart of Tornado Alley. Many homes here have
                  an in-ground garage storm shelter — a concrete lifeline buried
                  under the driveway. But after installation, those shelters
                  often go years without a deep clean, a working light, or
                  stocked emergency supplies.
                </p>
                <p>
                  Storm Sweep connects Norman homeowners with trained independent
                  contractor Sweepers who show up with professional equipment, a
                  detailed checklist, and the pride of a local who understands
                  what is at stake when Oklahoma weather turns dangerous.
                </p>
                <p>
                  We are launching in Norman — because this is our community —
                  and serve everywhere within about 15 miles, from Moore and
                  Noble to Newcastle, Midwest City, Del City and south Oklahoma
                  City.
                </p>
              </div>
            </div>

            <Card className="border-[color-mix(in_srgb,var(--color-border)_40%,transparent)] bg-[color-mix(in_srgb,var(--color-text)_5%,transparent)] text-[var(--color-text)] ring-[color-mix(in_srgb,var(--color-border)_40%,transparent)]">
              <CardHeader>
                <Target className="size-8 text-[var(--color-accent)]" />
                <CardTitle className="font-display text-3xl tracking-wide">
                  OUR MISSION
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-body text-base leading-relaxed text-[var(--color-text)]/70">
                  Make every underground storm shelter in Norman clean, lit,
                  stocked, and inspection-ready — so Oklahoma families never
                  hesitate to go underground when it matters most.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="border-y border-[color-mix(in_srgb,var(--color-border)_40%,transparent)] bg-[color-mix(in_srgb,var(--color-text)_5%,transparent)] py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="font-display text-4xl tracking-wide text-[var(--color-text)] sm:text-5xl">
              BY THE NUMBERS
            </h2>
            <p className="mx-auto mt-4 max-w-xl font-body text-base text-[var(--color-text)]/60">
              Oklahoma storm shelter stats that matter to Norman families.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {LOCAL_STATS.map((stat) => (
              <Card
                key={stat.label}
                className="border-[color-mix(in_srgb,var(--color-border)_40%,transparent)] bg-[color-mix(in_srgb,var(--color-text)_5%,transparent)] text-center text-[var(--color-text)] ring-[color-mix(in_srgb,var(--color-border)_40%,transparent)]"
              >
                <CardContent className="pt-6">
                  <p className="font-display text-5xl tracking-wide text-[var(--color-primary)]">
                    {stat.value}
                  </p>
                  <p className="mt-2 font-body text-sm font-semibold uppercase tracking-wide text-[var(--color-text)]">
                    {stat.label}
                  </p>
                  <p className="mt-2 font-body text-xs text-[var(--color-text)]/50">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h2 className="font-display text-4xl tracking-wide text-[var(--color-text)] sm:text-5xl">
              WHY STORM SWEEP?
            </h2>
            <p className="mt-4 font-body text-base text-[var(--color-text)]/60">
              Not just a cleaning service — a storm preparedness partner for
              Norman homeowners.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {WHY_STORM_SWEEP.map((item) => (
              <Card
                key={item.title}
                className="border-[color-mix(in_srgb,var(--color-border)_40%,transparent)] bg-[color-mix(in_srgb,var(--color-text)_5%,transparent)] text-[var(--color-text)] ring-[color-mix(in_srgb,var(--color-border)_40%,transparent)]"
              >
                <CardHeader>
                  <item.icon className="size-7 text-[var(--color-primary)]" />
                  <CardTitle className="font-display text-2xl tracking-wide">
                    {item.title}
                  </CardTitle>
                  <CardDescription className="text-base text-[var(--color-text)]/60">
                    {item.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[var(--color-danger)] py-16">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="font-display text-4xl tracking-wide text-[var(--color-text)] sm:text-5xl">
            Ready when Oklahoma is not.
          </h2>
          <p className="mx-auto mt-4 max-w-xl font-body text-base text-[var(--color-text)]/90">
            Book your first sweep or join Storm Ready — Norman&apos;s underground
            shelter specialists are standing by.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href="/book"
              className={cn(
                buttonVariants({ size: 'lg' }),
                'h-12 bg-white px-8 text-base font-semibold uppercase tracking-wide text-[var(--color-danger)] hover:bg-white/90'
              )}
            >
              Book a Sweep
            </Link>
            <Link
              href="/pricing"
              className={cn(
                buttonVariants({ size: 'lg', variant: 'outline' }),
                'h-12 border-white bg-transparent px-8 text-base font-semibold uppercase tracking-wide text-[var(--color-text)] hover:bg-white/10'
              )}
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
