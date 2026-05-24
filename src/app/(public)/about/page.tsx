import {
  Heart,
  MapPin,
  ShieldCheck,
  Target,
  Tornado,
  Users,
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
    description: 'Home to thousands of in-ground garage storm shelters',
  },
  {
    value: '#1',
    label: 'Tornado Alley',
    description: 'Oklahoma leads the nation in tornado frequency and severity',
  },
  {
    value: '48hr',
    label: 'Response time',
    description: 'Storm Sweep arrives within 48 hours of booking',
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
      'Before-and-after photos on every job. You see exactly what was done, even if you are not home when we arrive.',
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

const TEAM_PLACEHOLDERS = [
  {
    name: 'Founder & CEO',
    role: 'Operations',
    initials: 'SS',
  },
  {
    name: 'Lead Sweeper',
    role: 'Field Operations',
    initials: 'LS',
  },
  {
    name: 'Customer Success',
    role: 'Member Support',
    initials: 'CS',
  },
] as const

export default function AboutPage(): React.ReactElement {
  return (
    <>
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(46,134,193,0.18),transparent_55%)]" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <p className="font-[family-name:var(--font-barlow-condensed)] text-sm font-semibold uppercase tracking-[0.2em] text-sky-light">
            Norman, Oklahoma
          </p>
          <h1 className="mt-4 max-w-3xl font-[family-name:var(--font-bebas)] text-5xl leading-none tracking-wide text-white sm:text-6xl">
            ROOTED IN
            <br />
            <span className="text-sky-DEFAULT">TORNADO ALLEY.</span>
          </h1>
          <p className="mt-6 max-w-2xl font-[family-name:var(--font-barlow-condensed)] text-lg leading-relaxed text-white/70">
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
              <h2 className="font-[family-name:var(--font-bebas)] text-4xl tracking-wide text-white sm:text-5xl">
                OUR STORY
              </h2>
              <div className="mt-6 space-y-4 font-[family-name:var(--font-barlow-condensed)] text-base leading-relaxed text-white/70">
                <p>
                  Norman sits at the heart of Tornado Alley. Most homes here have
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
                  We are launching in Norman first — because this is our
                  community — with plans to expand across the OKC metro in year
                  two.
                </p>
              </div>
            </div>

            <Card className="border-white/10 bg-white/5 text-white ring-white/10">
              <CardHeader>
                <Target className="size-8 text-wheat-DEFAULT" />
                <CardTitle className="font-[family-name:var(--font-bebas)] text-3xl tracking-wide">
                  OUR MISSION
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-[family-name:var(--font-barlow-condensed)] text-base leading-relaxed text-white/70">
                  Make every underground storm shelter in Norman clean, lit,
                  stocked, and inspection-ready — so Oklahoma families never
                  hesitate to go underground when it matters most.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-black/20 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="font-[family-name:var(--font-bebas)] text-4xl tracking-wide text-white sm:text-5xl">
              BY THE NUMBERS
            </h2>
            <p className="mx-auto mt-4 max-w-xl font-[family-name:var(--font-barlow-condensed)] text-base text-white/60">
              Oklahoma storm shelter stats that matter to Norman families.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {LOCAL_STATS.map((stat) => (
              <Card
                key={stat.label}
                className="border-white/10 bg-white/5 text-center text-white ring-white/10"
              >
                <CardContent className="pt-6">
                  <p className="font-[family-name:var(--font-bebas)] text-5xl tracking-wide text-sky-DEFAULT">
                    {stat.value}
                  </p>
                  <p className="mt-2 font-[family-name:var(--font-barlow-condensed)] text-sm font-semibold uppercase tracking-wide text-white">
                    {stat.label}
                  </p>
                  <p className="mt-2 font-[family-name:var(--font-barlow-condensed)] text-xs text-white/50">
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
            <h2 className="font-[family-name:var(--font-bebas)] text-4xl tracking-wide text-white sm:text-5xl">
              WHY STORM SWEEP?
            </h2>
            <p className="mt-4 font-[family-name:var(--font-barlow-condensed)] text-base text-white/60">
              Not just a cleaning service — a storm preparedness partner for
              Norman homeowners.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {WHY_STORM_SWEEP.map((item) => (
              <Card
                key={item.title}
                className="border-white/10 bg-white/5 text-white ring-white/10"
              >
                <CardHeader>
                  <item.icon className="size-7 text-sky-DEFAULT" />
                  <CardTitle className="font-[family-name:var(--font-bebas)] text-2xl tracking-wide">
                    {item.title}
                  </CardTitle>
                  <CardDescription className="text-base text-white/60">
                    {item.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 bg-black/20 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="font-[family-name:var(--font-bebas)] text-4xl tracking-wide text-white sm:text-5xl">
              THE TEAM
            </h2>
            <p className="mx-auto mt-4 max-w-xl font-[family-name:var(--font-barlow-condensed)] text-base text-white/60">
              Norman locals building something Oklahoma families can count on.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {TEAM_PLACEHOLDERS.map((member) => (
              <Card
                key={member.role}
                className="border-white/10 bg-white/5 text-center text-white ring-white/10"
              >
                <CardContent className="pt-8">
                  <div className="mx-auto flex size-20 items-center justify-center rounded-full border border-sky-DEFAULT/30 bg-sky-DEFAULT/10">
                    <Users className="size-8 text-sky-DEFAULT" />
                  </div>
                  <p className="mt-2 font-[family-name:var(--font-bebas)] text-4xl tracking-wide text-white/20">
                    {member.initials}
                  </p>
                  <p className="mt-4 font-[family-name:var(--font-barlow-condensed)] text-base font-semibold text-white">
                    {member.name}
                  </p>
                  <p className="font-[family-name:var(--font-barlow-condensed)] text-sm text-white/50">
                    {member.role}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-tornado py-16">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="font-[family-name:var(--font-bebas)] text-4xl tracking-wide text-white sm:text-5xl">
            Ready when Oklahoma is not.
          </h2>
          <p className="mx-auto mt-4 max-w-xl font-[family-name:var(--font-barlow-condensed)] text-base text-white/90">
            Book your first sweep or join Storm Ready — Norman&apos;s underground
            shelter specialists are standing by.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href="/book"
              className={cn(
                buttonVariants({ size: 'lg' }),
                'h-12 bg-white px-8 text-base font-semibold uppercase tracking-wide text-tornado hover:bg-white/90'
              )}
            >
              Book a Sweep
            </Link>
            <Link
              href="/pricing"
              className={cn(
                buttonVariants({ size: 'lg', variant: 'outline' }),
                'h-12 border-white bg-transparent px-8 text-base font-semibold uppercase tracking-wide text-white hover:bg-white/10'
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
