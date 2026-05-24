import {
  CalendarCheck,
  Camera,
  Lightbulb,
  Package,
  ShieldCheck,
  Sparkles,
  Star,
  Truck,
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
import { cn, formatCurrency, PRICING } from '@/lib/utils'

const TRUST_ITEMS = [
  'Norman-owned',
  'Arrives within 48hrs',
  'Photo report every visit',
  'Licensed & Insured',
] as const

const SERVICES = [
  {
    title: 'Deep Clean',
    description:
      'Full scrub, vacuum, mold treatment, and deodorizer for your underground shelter.',
    icon: Sparkles,
    price: PRICING.shelter.standard,
  },
  {
    title: 'LED Lighting',
    description:
      'Bright, reliable LED upgrade so your shelter is ready when the sirens sound.',
    icon: Lightbulb,
    price: PRICING.addons.led_package,
  },
  {
    title: 'Supply Kits',
    description:
      'Curated emergency kits from starter to Storm Ready Elite — stocked and organized.',
    icon: Package,
    price: PRICING.addons.supply_kit_essential,
  },
  {
    title: 'Full Package',
    description:
      'Deep clean + LED lighting + essential supply kit — the complete storm-ready upgrade.',
    icon: ShieldCheck,
    price: PRICING.bundles.full_package,
  },
] as const

const STEPS = [
  {
    step: '01',
    title: 'Book Online',
    description:
      'Choose your service, pick a date, and upload a shelter photo so your Sweeper arrives prepared.',
    icon: CalendarCheck,
  },
  {
    step: '02',
    title: 'Sweeper Arrives',
    description:
      'A trained Storm Sweep technician arrives on time with pro equipment and a detailed checklist.',
    icon: Truck,
  },
  {
    step: '03',
    title: 'See the Difference',
    description:
      'Before-and-after photos, walkthrough with your Sweeper, and a shelter that is clean and ready.',
    icon: Camera,
  },
] as const

const TESTIMONIALS = [
  {
    name: 'Sarah M.',
    location: 'Norman, OK',
    quote:
      'Our shelter had not been touched in years. Storm Sweep made it feel brand new — and the photo report was incredible.',
    rating: 5,
  },
  {
    name: 'James & Linda T.',
    location: 'Moore, OK',
    quote:
      'We joined Storm Ready and got our first visit before tornado season. Worth every penny for peace of mind.',
    rating: 5,
  },
  {
    name: 'Mike R.',
    location: 'Noble, OK',
    quote:
      'Professional, fast, and local. They found a hinge issue we never noticed and fixed it on the spot.',
    rating: 5,
  },
] as const

export default function HomePage(): React.ReactElement {
  return (
    <>
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(46,134,193,0.18),transparent_55%)]" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <p className="font-[family-name:var(--font-barlow-condensed)] text-sm font-semibold uppercase tracking-[0.2em] text-sky-light">
            Norman, Oklahoma · Underground Shelter Specialists
          </p>
          <h1 className="mt-4 max-w-3xl font-[family-name:var(--font-bebas)] text-5xl leading-none tracking-wide text-white sm:text-6xl lg:text-7xl">
            Your Storm Shelter.
            <br />
            <span className="text-sky-DEFAULT">Clean.</span> Ready. Safe.
          </h1>
          <p className="mt-6 max-w-xl font-[family-name:var(--font-barlow-condensed)] text-lg leading-relaxed text-white/70">
            Professional cleaning, lighting upgrades, and emergency supply kits
            for underground storm shelters across the Norman metro.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/book"
              className={cn(
                buttonVariants({ size: 'lg' }),
                'h-12 bg-sky-DEFAULT px-8 text-base font-semibold uppercase tracking-wide text-white hover:bg-sky-dark'
              )}
            >
              Book a Sweep
            </Link>
            <Link
              href="/pricing"
              className={cn(
                buttonVariants({ size: 'lg', variant: 'outline' }),
                'h-12 border-wheat-DEFAULT bg-transparent px-8 text-base font-semibold uppercase tracking-wide text-wheat-DEFAULT hover:bg-wheat-DEFAULT/10 hover:text-wheat-light'
              )}
            >
              Storm Ready Membership
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 bg-black/20">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 px-4 py-8 sm:grid-cols-4 sm:px-6 lg:px-8">
          {TRUST_ITEMS.map((item) => (
            <div
              key={item}
              className="flex items-center justify-center gap-2 text-center"
            >
              <ShieldCheck className="size-4 shrink-0 text-sky-DEFAULT" />
              <span className="font-[family-name:var(--font-barlow-condensed)] text-xs font-semibold uppercase tracking-wide text-white/80 sm:text-sm">
                {item}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h2 className="font-[family-name:var(--font-bebas)] text-4xl tracking-wide text-white sm:text-5xl">
              OUR SERVICES
            </h2>
            <p className="mt-4 font-[family-name:var(--font-barlow-condensed)] text-base text-white/60">
              From deep cleaning to full storm-ready upgrades — everything your
              underground shelter needs.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {SERVICES.map((service) => (
              <Card
                key={service.title}
                className="border-white/10 bg-white/5 text-white ring-white/10"
              >
                <CardHeader>
                  <service.icon className="size-8 text-sky-DEFAULT" />
                  <CardTitle className="font-[family-name:var(--font-bebas)] text-2xl tracking-wide">
                    {service.title}
                  </CardTitle>
                  <CardDescription className="text-white/60">
                    {service.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="font-[family-name:var(--font-bebas)] text-3xl tracking-wide text-wheat-DEFAULT">
                    from {formatCurrency(service.price)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link
              href="/services"
              className="font-[family-name:var(--font-barlow-condensed)] text-sm font-semibold uppercase tracking-wide text-sky-light hover:text-white"
            >
              View all services →
            </Link>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-black/20 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center font-[family-name:var(--font-bebas)] text-4xl tracking-wide text-white sm:text-5xl">
            HOW IT WORKS
          </h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.step} className="text-center">
                <div className="mx-auto flex size-14 items-center justify-center rounded-full border border-sky-DEFAULT/30 bg-sky-DEFAULT/10">
                  <step.icon className="size-6 text-sky-DEFAULT" />
                </div>
                <p className="mt-4 font-[family-name:var(--font-bebas)] text-5xl tracking-wide text-white/20">
                  {step.step}
                </p>
                <h3 className="font-[family-name:var(--font-bebas)] text-2xl tracking-wide text-white">
                  {step.title}
                </h3>
                <p className="mt-3 font-[family-name:var(--font-barlow-condensed)] text-sm leading-relaxed text-white/60">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="font-[family-name:var(--font-bebas)] text-4xl tracking-wide text-white sm:text-5xl">
              SIMPLE PRICING
            </h2>
            <p className="mt-4 font-[family-name:var(--font-barlow-condensed)] text-base text-white/60">
              One-time sweep or year-round peace of mind.
            </p>
          </div>

          <div className="mt-12 grid gap-8 md:grid-cols-2">
            <Card className="border-white/10 bg-white/5 text-white ring-white/10">
              <CardHeader>
                <CardTitle className="font-[family-name:var(--font-bebas)] text-3xl tracking-wide">
                  SINGLE SWEEP
                </CardTitle>
                <CardDescription className="text-white/60">
                  Standard underground shelter deep clean
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="font-[family-name:var(--font-bebas)] text-5xl tracking-wide text-white">
                  {formatCurrency(PRICING.shelter.standard)}
                </p>
                <ul className="space-y-2 font-[family-name:var(--font-barlow-condensed)] text-sm text-white/70">
                  <li>· Full deep clean checklist</li>
                  <li>· Before &amp; after photo report</li>
                  <li>· Mold treatment &amp; deodorizer</li>
                  <li>· Shelter inspection included</li>
                </ul>
                <Link
                  href="/book"
                  className={cn(
                    buttonVariants({ size: 'lg' }),
                    'mt-4 h-11 w-full bg-sky-DEFAULT text-white hover:bg-sky-dark'
                  )}
                >
                  Book a Sweep
                </Link>
              </CardContent>
            </Card>

            <Card className="border-wheat-DEFAULT/40 bg-wheat-DEFAULT/5 text-white ring-wheat-DEFAULT/20">
              <CardHeader>
                <p className="font-[family-name:var(--font-barlow-condensed)] text-xs font-semibold uppercase tracking-[0.2em] text-wheat-DEFAULT">
                  Most Popular
                </p>
                <CardTitle className="font-[family-name:var(--font-bebas)] text-3xl tracking-wide">
                  STORM READY
                </CardTitle>
                <CardDescription className="text-white/60">
                  2 visits per year + 10% off upgrades
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="font-[family-name:var(--font-bebas)] text-5xl tracking-wide text-wheat-DEFAULT">
                  {formatCurrency(PRICING.membership.annual)}
                  <span className="text-2xl text-white/60">/yr</span>
                </p>
                <ul className="space-y-2 font-[family-name:var(--font-barlow-condensed)] text-sm text-white/70">
                  <li>· 2 scheduled visits per year</li>
                  <li>· Priority booking before storm season</li>
                  <li>· 10% off all upgrades &amp; add-ons</li>
                  <li>· Photo report after every visit</li>
                </ul>
                <Link
                  href="/book?membership=annual"
                  className={cn(
                    buttonVariants({ size: 'lg' }),
                    'mt-4 h-11 w-full bg-wheat-DEFAULT text-shelter hover:bg-wheat-light'
                  )}
                >
                  Join Storm Ready
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 bg-black/20 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center font-[family-name:var(--font-bebas)] text-4xl tracking-wide text-white sm:text-5xl">
            WHAT NORMAN FAMILIES SAY
          </h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((testimonial) => (
              <Card
                key={testimonial.name}
                className="border-white/10 bg-white/5 text-white ring-white/10"
              >
                <CardContent className="pt-6">
                  <div className="flex gap-1">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <Star
                        key={i}
                        className="size-4 fill-wheat-DEFAULT text-wheat-DEFAULT"
                      />
                    ))}
                  </div>
                  <p className="mt-4 font-[family-name:var(--font-barlow-condensed)] text-sm leading-relaxed text-white/70">
                    &ldquo;{testimonial.quote}&rdquo;
                  </p>
                  <p className="mt-4 font-[family-name:var(--font-barlow-condensed)] text-sm font-semibold text-white">
                    {testimonial.name}
                  </p>
                  <p className="font-[family-name:var(--font-barlow-condensed)] text-xs text-white/50">
                    {testimonial.location}
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
            Tornado season doesn&apos;t wait.
          </h2>
          <p className="mx-auto mt-4 max-w-xl font-[family-name:var(--font-barlow-condensed)] text-base text-white/90">
            Book your sweep today and know your shelter is clean, stocked, and
            ready when Oklahoma skies turn green.
          </p>
          <Link
            href="/book"
            className={cn(
              buttonVariants({ size: 'lg' }),
              'mt-8 h-12 bg-white px-8 text-base font-semibold uppercase tracking-wide text-tornado hover:bg-white/90'
            )}
          >
            Book a Sweep Now
          </Link>
        </div>
      </section>
    </>
  )
}
