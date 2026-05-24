import {
  Check,
  DoorOpen,
  Lightbulb,
  Package,
  ShieldCheck,
  Sparkles,
  Wrench,
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
import { cn, formatCurrency, PRICING, SUPPLY_KITS } from '@/lib/utils'

const SERVICE_TYPES = [
  {
    title: 'Deep Clean',
    icon: Sparkles,
    priceLabel: `from ${formatCurrency(PRICING.shelter.small)}`,
    description:
      'Our signature underground shelter deep clean — the foundation of every Storm Sweep visit.',
    includes: [
      'Debris and trash removal with customer review',
      'Top-down vacuum of ceiling, walls, and floor',
      'Mold and mildew treatment with dwell time',
      'Scrub, rinse, and deodorizer application',
      'Hatch door interior and hinge cleaning',
      'Full shelter inspection with photo documentation',
      'Before-and-after photo report delivered digitally',
    ],
  },
  {
    title: 'LED Lighting Package',
    icon: Lightbulb,
    priceLabel: formatCurrency(PRICING.addons.led_package),
    description:
      'Replace dim or missing shelter lighting with bright, reliable LED fixtures so your family can see clearly when seconds count.',
    includes: [
      'Assessment of existing lighting during inspection',
      'Professional LED fixture installation',
      'Battery backup or hardwired options as applicable',
      'Verified illumination before your Sweeper leaves',
      'Pairs with any shelter size deep clean',
    ],
  },
  {
    title: 'Emergency Supply Kits',
    icon: Package,
    priceLabel: `from ${formatCurrency(PRICING.addons.supply_kit_starter)}`,
    description:
      'Curated emergency kits stocked and organized inside your shelter — from basic starter supplies to full Storm Ready Elite packages for families.',
    includes: [
      'Five tiers: Starter through Storm Ready Elite',
      'Water, first aid, lighting, and communication essentials',
      'Family and baby/toddler comfort items in upper tiers',
      'Organized placement inside your shelter',
      'Inventory logged in your Storm Sweep photo report',
    ],
  },
  {
    title: 'Full Package',
    icon: ShieldCheck,
    priceLabel: formatCurrency(PRICING.bundles.full_package),
    description:
      'The complete storm-ready upgrade: standard-size deep clean, LED lighting package, and Essential supply kit — bundled for maximum value.',
    includes: [
      'Standard shelter deep clean (up to typical 6-person size)',
      'LED Lighting Package included',
      'Essential Supply Kit included',
      'Full inspection and photo report',
      'Best value for first-time customers getting fully storm ready',
    ],
  },
] as const

const DOOR_HARDWARE_UPGRADES = [
  {
    name: 'Interior Handle Install',
    price: PRICING.addons.interior_handle,
    description: 'Replace missing or broken interior hatch handles for safe exit.',
  },
  {
    name: 'Hinge Service',
    price: PRICING.addons.hinge_service,
    description: 'Lubricate, adjust, or repair sticky or rusted hatch hinges.',
  },
  {
    name: 'Lock Replacement',
    price: PRICING.addons.lock_replacement,
    description: 'Install a new interior lock mechanism when yours fails inspection.',
  },
  {
    name: 'Extension Cord',
    price: PRICING.addons.extension_cord,
    description: '25ft+ cord for powering equipment during service and shelter use.',
  },
] as const

export default function ServicesPage(): React.ReactElement {
  return (
    <>
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(46,134,193,0.18),transparent_55%)]" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <p className="font-[family-name:var(--font-barlow-condensed)] text-sm font-semibold uppercase tracking-[0.2em] text-sky-light">
            What We Do
          </p>
          <h1 className="mt-4 max-w-3xl font-[family-name:var(--font-bebas)] text-5xl leading-none tracking-wide text-white sm:text-6xl">
            SHELTER SERVICES
            <br />
            <span className="text-sky-DEFAULT">&amp; UPGRADES</span>
          </h1>
          <p className="mt-6 max-w-2xl font-[family-name:var(--font-barlow-condensed)] text-lg leading-relaxed text-white/70">
            Professional cleaning, lighting, stocking, and hardware upgrades for
            underground storm shelters across Norman and the OKC metro.
          </p>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h2 className="font-[family-name:var(--font-bebas)] text-4xl tracking-wide text-white sm:text-5xl">
              SERVICE TYPES
            </h2>
            <p className="mt-4 font-[family-name:var(--font-barlow-condensed)] text-base text-white/60">
              Four ways to get your shelter clean, lit, stocked, and
              inspection-ready.
            </p>
          </div>

          <div className="mt-12 space-y-8">
            {SERVICE_TYPES.map((service) => (
              <Card
                key={service.title}
                className="border-white/10 bg-white/5 text-white ring-white/10"
              >
                <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-sky-DEFAULT/30 bg-sky-DEFAULT/10">
                      <service.icon className="size-6 text-sky-DEFAULT" />
                    </div>
                    <div>
                      <CardTitle className="font-[family-name:var(--font-bebas)] text-3xl tracking-wide">
                        {service.title}
                      </CardTitle>
                      <CardDescription className="mt-2 max-w-2xl text-base text-white/60">
                        {service.description}
                      </CardDescription>
                    </div>
                  </div>
                  <p className="shrink-0 font-[family-name:var(--font-bebas)] text-3xl tracking-wide text-wheat-DEFAULT sm:text-right">
                    {service.priceLabel}
                  </p>
                </CardHeader>
                <CardContent>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {service.includes.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-2 font-[family-name:var(--font-barlow-condensed)] text-sm text-white/70"
                      >
                        <Check className="mt-0.5 size-4 shrink-0 text-sky-DEFAULT" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-black/20 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h2 className="font-[family-name:var(--font-bebas)] text-4xl tracking-wide text-white sm:text-5xl">
              UPGRADE ADD-ONS
            </h2>
            <p className="mt-4 font-[family-name:var(--font-barlow-condensed)] text-base text-white/60">
              Add to any visit or bundle with your booking. Storm Ready members
              save 10% on all upgrades.
            </p>
          </div>

          <div className="mt-12">
            <div className="mb-6 flex items-center gap-3">
              <Lightbulb className="size-5 text-sky-DEFAULT" />
              <h3 className="font-[family-name:var(--font-bebas)] text-2xl tracking-wide text-white">
                LED PACKAGE
              </h3>
            </div>
            <Card className="border-white/10 bg-white/5 text-white ring-white/10">
              <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="font-[family-name:var(--font-barlow-condensed)] text-base text-white/80">
                  Bright LED lighting upgrade for any shelter size. Installed
                  and tested during your visit.
                </p>
                <p className="font-[family-name:var(--font-bebas)] text-3xl tracking-wide text-wheat-DEFAULT">
                  {formatCurrency(PRICING.addons.led_package)}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-12">
            <div className="mb-6 flex items-center gap-3">
              <Package className="size-5 text-sky-DEFAULT" />
              <h3 className="font-[family-name:var(--font-bebas)] text-2xl tracking-wide text-white">
                SUPPLY KIT TIERS
              </h3>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(SUPPLY_KITS).map(([key, kit]) => (
                <Card
                  key={key}
                  className="border-white/10 bg-white/5 text-white ring-white/10"
                >
                  <CardHeader>
                    <CardTitle className="font-[family-name:var(--font-bebas)] text-xl tracking-wide">
                      {kit.name}
                    </CardTitle>
                    <p className="font-[family-name:var(--font-bebas)] text-2xl tracking-wide text-wheat-DEFAULT">
                      {formatCurrency(kit.price)}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1.5">
                      {kit.items.map((item) => (
                        <li
                          key={item}
                          className="flex items-start gap-2 font-[family-name:var(--font-barlow-condensed)] text-xs text-white/60"
                        >
                          <Check className="mt-0.5 size-3 shrink-0 text-sky-DEFAULT" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="mt-12">
            <div className="mb-6 flex items-center gap-3">
              <DoorOpen className="size-5 text-sky-DEFAULT" />
              <h3 className="font-[family-name:var(--font-bebas)] text-2xl tracking-wide text-white">
                DOOR &amp; HARDWARE UPGRADES
              </h3>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {DOOR_HARDWARE_UPGRADES.map((upgrade) => (
                <Card
                  key={upgrade.name}
                  className="border-white/10 bg-white/5 text-white ring-white/10"
                >
                  <CardContent className="flex items-start gap-4 pt-6">
                    <Wrench className="mt-0.5 size-5 shrink-0 text-sky-DEFAULT" />
                    <div className="flex-1">
                      <p className="font-[family-name:var(--font-barlow-condensed)] text-base font-semibold text-white">
                        {upgrade.name}
                      </p>
                      <p className="mt-1 font-[family-name:var(--font-barlow-condensed)] text-sm text-white/60">
                        {upgrade.description}
                      </p>
                    </div>
                    <p className="font-[family-name:var(--font-bebas)] text-xl tracking-wide text-wheat-DEFAULT">
                      {formatCurrency(upgrade.price)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <p className="mt-4 font-[family-name:var(--font-barlow-condensed)] text-sm text-white/50">
              Major door or structural repairs are quoted on-site after
              inspection. Your Sweeper will flag issues during every visit.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-tornado py-16">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="font-[family-name:var(--font-bebas)] text-4xl tracking-wide text-white sm:text-5xl">
            Ready to book your sweep?
          </h2>
          <p className="mx-auto mt-4 max-w-xl font-[family-name:var(--font-barlow-condensed)] text-base text-white/90">
            Choose your services, pick a date, and a Norman Sweeper will arrive
            within 48 hours with everything needed to get your shelter storm
            ready.
          </p>
          <Link
            href="/book"
            className={cn(
              buttonVariants({ size: 'lg' }),
              'mt-8 h-12 bg-white px-8 text-base font-semibold uppercase tracking-wide text-tornado hover:bg-white/90'
            )}
          >
            Book a Sweep
          </Link>
        </div>
      </section>
    </>
  )
}
