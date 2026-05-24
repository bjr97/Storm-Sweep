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

import { HomeHero } from '@/components/home/HomeHeroSwitcher'
import { SectionDivider } from '@/components/home/SectionDivider'
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
      <HomeHero />
      <SectionDivider />

      <section className="border-b border-[color-mix(in_srgb,var(--color-border)_40%,transparent)] bg-[color-mix(in_srgb,var(--color-text)_5%,transparent)]">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 px-4 py-8 sm:grid-cols-4 sm:px-6 lg:px-8">
          {TRUST_ITEMS.map((item) => (
            <div
              key={item}
              className="flex items-center justify-center gap-2 text-center"
            >
              <ShieldCheck className="size-4 shrink-0 text-[var(--color-primary)]" />
              <span className="font-body text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] sm:text-sm">
                {item}
              </span>
            </div>
          ))}
        </div>
      </section>
      <SectionDivider />

      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h2 className="font-display text-4xl tracking-wide text-[var(--color-text)] sm:text-5xl">
              OUR SERVICES
            </h2>
            <p className="mt-4 font-body text-base text-[var(--color-text-muted)]">
              From deep cleaning to full storm-ready upgrades — everything your
              underground shelter needs.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {SERVICES.map((service) => (
              <Card
                key={service.title}
                className="pixel-card border-[color-mix(in_srgb,var(--color-border)_40%,transparent)] bg-[color-mix(in_srgb,var(--color-text)_5%,transparent)] text-[var(--color-text)]"
              >
                <CardHeader>
                  <service.icon className="size-8 text-[var(--color-primary)]" />
                  <CardTitle className="font-display text-2xl tracking-wide">
                    {service.title}
                  </CardTitle>
                  <CardDescription className="text-[var(--color-text-muted)]">
                    {service.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="font-display text-3xl tracking-wide text-[var(--color-accent)]">
                    from {formatCurrency(service.price)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link
              href="/services"
              className="font-body text-sm font-semibold uppercase tracking-wide text-[var(--color-primary-light)] hover:text-[var(--color-text)]"
            >
              View all services →
            </Link>
          </div>
        </div>
      </section>
      <SectionDivider />

      <section className="border-y border-[color-mix(in_srgb,var(--color-border)_40%,transparent)] bg-[color-mix(in_srgb,var(--color-text)_5%,transparent)] py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center font-display text-4xl tracking-wide text-[var(--color-text)] sm:text-5xl">
            HOW IT WORKS
          </h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.step} className="text-center">
                <div className="mx-auto flex size-14 items-center justify-center rounded-full border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10">
                  <step.icon className="size-6 text-[var(--color-primary)]" />
                </div>
                <p className="mt-4 font-display text-5xl tracking-wide text-[var(--color-text)]/20">
                  {step.step}
                </p>
                <h3 className="font-display text-2xl tracking-wide text-[var(--color-text)]">
                  {step.title}
                </h3>
                <p className="mt-3 font-body text-sm leading-relaxed text-[var(--color-text-muted)]">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <SectionDivider />

      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="font-display text-4xl tracking-wide text-[var(--color-text)] sm:text-5xl">
              SIMPLE PRICING
            </h2>
            <p className="mt-4 font-body text-base text-[var(--color-text-muted)]">
              One-time sweep or year-round peace of mind.
            </p>
          </div>

          <div className="mt-12 grid gap-8 md:grid-cols-2">
            <Card className="pixel-card border-[color-mix(in_srgb,var(--color-border)_40%,transparent)] bg-[color-mix(in_srgb,var(--color-text)_5%,transparent)] text-[var(--color-text)]">
              <CardHeader>
                <CardTitle className="font-display text-3xl tracking-wide">
                  SINGLE SWEEP
                </CardTitle>
                <CardDescription className="text-[var(--color-text-muted)]">
                  Standard underground shelter deep clean
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="font-display text-5xl tracking-wide text-[var(--color-text)]">
                  {formatCurrency(PRICING.shelter.standard)}
                </p>
                <ul className="space-y-2 font-body text-sm text-[var(--color-text-muted)]">
                  <li>· Full deep clean checklist</li>
                  <li>· Before &amp; after photo report</li>
                  <li>· Mold treatment &amp; deodorizer</li>
                  <li>· Shelter inspection included</li>
                </ul>
                <Link
                  href="/book"
                  className={cn(
                    buttonVariants({ size: 'lg' }),
                    'pixel-btn mt-4 h-11 w-full bg-[var(--color-primary)] text-[var(--color-text)] hover:opacity-90'
                  )}
                >
                  Book a Sweep
                </Link>
              </CardContent>
            </Card>

            <Card className="pixel-card border-[var(--color-accent)]/40 bg-[var(--color-accent)]/5 text-[var(--color-text)]">
              <CardHeader>
                <p className="font-body text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                  Most Popular
                </p>
                <CardTitle className="font-display text-3xl tracking-wide">
                  STORM READY
                </CardTitle>
                <CardDescription className="text-[var(--color-text-muted)]">
                  2 visits per year + 10% off upgrades
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="font-display text-5xl tracking-wide text-[var(--color-accent)]">
                  {formatCurrency(PRICING.membership.annual)}
                  <span className="text-2xl text-[var(--color-text-muted)]">/yr</span>
                </p>
                <ul className="space-y-2 font-body text-sm text-[var(--color-text-muted)]">
                  <li>· 2 scheduled visits per year</li>
                  <li>· Priority booking before storm season</li>
                  <li>· 10% off all upgrades &amp; add-ons</li>
                  <li>· Photo report after every visit</li>
                </ul>
                <Link
                  href="/book?membership=annual"
                  className={cn(
                    buttonVariants({ size: 'lg' }),
                    'pixel-btn mt-4 h-11 w-full bg-[var(--color-accent)] text-[var(--color-bg)] hover:opacity-90'
                  )}
                >
                  Join Storm Ready
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      <SectionDivider />

      <section className="border-t border-[color-mix(in_srgb,var(--color-border)_40%,transparent)] bg-[color-mix(in_srgb,var(--color-text)_5%,transparent)] py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center font-display text-4xl tracking-wide text-[var(--color-text)] sm:text-5xl">
            WHAT NORMAN FAMILIES SAY
          </h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((testimonial) => (
              <Card
                key={testimonial.name}
                className="pixel-card border-[color-mix(in_srgb,var(--color-border)_40%,transparent)] bg-[color-mix(in_srgb,var(--color-text)_5%,transparent)] text-[var(--color-text)]"
              >
                <CardContent className="pt-6">
                  <div className="flex gap-1">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <Star
                        key={i}
                        className="size-4 fill-[var(--color-accent)] text-[var(--color-accent)]"
                      />
                    ))}
                  </div>
                  <p className="mt-4 font-body text-sm leading-relaxed text-[var(--color-text-muted)]">
                    &ldquo;{testimonial.quote}&rdquo;
                  </p>
                  <p className="mt-4 font-body text-sm font-semibold text-[var(--color-text)]">
                    {testimonial.name}
                  </p>
                  <p className="font-body text-xs text-[var(--color-text-muted)]">
                    {testimonial.location}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
      <SectionDivider />

      <section className="bg-[var(--color-danger)] py-16">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="font-display text-4xl tracking-wide text-[var(--color-paper,var(--color-text))] sm:text-5xl">
            Tornado season doesn&apos;t wait.
          </h2>
          <p className="mx-auto mt-4 max-w-xl font-body text-base text-[var(--color-paper,var(--color-text))]/90">
            Book your sweep today and know your shelter is clean, stocked, and
            ready when Oklahoma skies turn green.
          </p>
          <Link
            href="/book"
            className={cn(
              buttonVariants({ size: 'lg' }),
              'pixel-btn mt-8 h-12 bg-[var(--color-paper,#fff)] px-8 text-base font-semibold uppercase tracking-wide text-[var(--color-danger)] hover:opacity-90'
            )}
          >
            Book a Sweep Now
          </Link>
        </div>
      </section>
    </>
  )
}
