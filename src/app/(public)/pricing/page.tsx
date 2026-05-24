import { Check, Minus } from 'lucide-react'
import Link from 'next/link'

import { MembershipPricingCard } from '@/app/(public)/pricing/MembershipPricingCard'
import { buttonVariants } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn, formatCurrency, PRICING } from '@/lib/utils'

const SHELTER_SIZES = [
  {
    label: 'Small',
    description: 'Up to 4-person shelter',
    price: PRICING.shelter.small,
  },
  {
    label: 'Standard',
    description: 'Typical 6-person shelter',
    price: PRICING.shelter.standard,
  },
  {
    label: 'Large',
    description: '8+ person or oversized shelter',
    price: PRICING.shelter.large,
  },
] as const

const COMPARISON_FEATURES = [
  {
    label: 'Full deep clean checklist',
    single: true,
    membership: true,
  },
  {
    label: 'Before & after photo report',
    single: true,
    membership: true,
  },
  {
    label: 'Mold treatment & deodorizer',
    single: true,
    membership: true,
  },
  {
    label: 'Shelter inspection included',
    single: true,
    membership: true,
  },
  {
    label: '2 scheduled visits per year',
    single: false,
    membership: true,
  },
  {
    label: 'Priority storm season booking',
    single: false,
    membership: true,
  },
  {
    label: '10% off upgrades & add-ons',
    single: false,
    membership: true,
  },
] as const

const FAQ_ITEMS = [
  {
    question: 'What is included in a Single Sweep?',
    answer:
      'Every Single Sweep includes our full deep clean checklist, mold and mildew treatment, deodorizer, a complete shelter inspection, and a digital before-and-after photo report. Price depends on your shelter size — small, standard, or large.',
  },
  {
    question: 'How does Storm Ready membership work?',
    getAnswer: (): string =>
      `Storm Ready members receive two scheduled visits per year — typically before and during tornado season. You get priority booking, 10% off all upgrades and add-ons, and a photo report after every visit. Choose annual billing at ${formatCurrency(PRICING.membership.annual)}/yr or monthly at ${formatCurrency(PRICING.membership.monthly)}/mo at checkout.`,
  },
  {
    question: 'Do you service areas outside Norman?',
    answer:
      'We launch in Norman, OK and surrounding communities in the OKC metro. During booking, enter your address and we will confirm service availability. Moore, Noble, and nearby areas are on our expansion roadmap.',
  },
  {
    question: 'When is my balance due?',
    getAnswer: (): string =>
      `A ${Math.round(PRICING.deposit_pct * 100)}% deposit is collected at booking. The remaining balance is charged automatically after your Sweeper completes the job and you sign off on the digital report.`,
  },
] as const

function FeatureIcon({ included }: { included: boolean }): React.ReactElement {
  if (included) {
    return <Check className="size-5 text-sky-DEFAULT" aria-hidden="true" />
  }
  return <Minus className="size-5 text-white/30" aria-hidden="true" />
}

export default function PricingPage(): React.ReactElement {
  return (
    <>
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(46,134,193,0.18),transparent_55%)]" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <p className="font-[family-name:var(--font-barlow-condensed)] text-sm font-semibold uppercase tracking-[0.2em] text-sky-light">
            Transparent Pricing
          </p>
          <h1 className="mt-4 max-w-3xl font-[family-name:var(--font-bebas)] text-5xl leading-none tracking-wide text-white sm:text-6xl">
            SIMPLE PLANS.
            <br />
            <span className="text-sky-DEFAULT">REAL PROTECTION.</span>
          </h1>
          <p className="mt-6 max-w-2xl font-[family-name:var(--font-barlow-condensed)] text-lg leading-relaxed text-white/70">
            One-time sweep or year-round Storm Ready membership — both include
            our full checklist, inspection, and photo report.
          </p>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-2">
            <Card className="border-white/10 bg-white/5 text-white ring-white/10">
              <CardHeader>
                <CardTitle className="font-[family-name:var(--font-bebas)] text-3xl tracking-wide">
                  SINGLE SWEEP
                </CardTitle>
                <CardDescription className="text-white/60">
                  One-time underground shelter deep clean
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <p className="font-[family-name:var(--font-barlow-condensed)] text-sm font-semibold uppercase tracking-wide text-white/50">
                    Pricing by shelter size
                  </p>
                  <div className="mt-4 overflow-hidden rounded-lg border border-white/10">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/10 bg-black/20">
                          <th className="px-4 py-3 text-left font-[family-name:var(--font-barlow-condensed)] text-xs font-semibold uppercase tracking-wide text-white/50">
                            Size
                          </th>
                          <th className="px-4 py-3 text-left font-[family-name:var(--font-barlow-condensed)] text-xs font-semibold uppercase tracking-wide text-white/50">
                            Description
                          </th>
                          <th className="px-4 py-3 text-right font-[family-name:var(--font-barlow-condensed)] text-xs font-semibold uppercase tracking-wide text-white/50">
                            Price
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {SHELTER_SIZES.map((size, index) => (
                          <tr
                            key={size.label}
                            className={
                              index < SHELTER_SIZES.length - 1
                                ? 'border-b border-white/10'
                                : undefined
                            }
                          >
                            <td className="px-4 py-3 font-[family-name:var(--font-barlow-condensed)] text-sm font-semibold text-white">
                              {size.label}
                            </td>
                            <td className="px-4 py-3 font-[family-name:var(--font-barlow-condensed)] text-sm text-white/60">
                              {size.description}
                            </td>
                            <td className="px-4 py-3 text-right font-[family-name:var(--font-bebas)] text-xl tracking-wide text-wheat-DEFAULT">
                              {formatCurrency(size.price)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

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
                    'h-11 w-full bg-sky-DEFAULT text-white hover:bg-sky-dark'
                  )}
                >
                  Book Now
                </Link>
              </CardContent>
            </Card>

            <MembershipPricingCard />
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-black/20 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center font-[family-name:var(--font-bebas)] text-4xl tracking-wide text-white sm:text-5xl">
            FEATURE COMPARISON
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center font-[family-name:var(--font-barlow-condensed)] text-base text-white/60">
            See what you get with each plan at a glance.
          </p>

          <div className="mt-12 overflow-hidden rounded-lg border border-white/10">
            <div className="grid grid-cols-[1fr_auto_auto] border-b border-white/10 bg-black/30">
              <div className="px-4 py-4 font-[family-name:var(--font-barlow-condensed)] text-xs font-semibold uppercase tracking-wide text-white/50">
                Feature
              </div>
              <div className="px-6 py-4 text-center font-[family-name:var(--font-barlow-condensed)] text-xs font-semibold uppercase tracking-wide text-white/50">
                Single
              </div>
              <div className="px-6 py-4 text-center font-[family-name:var(--font-barlow-condensed)] text-xs font-semibold uppercase tracking-wide text-wheat-DEFAULT">
                Storm Ready
              </div>
            </div>
            {COMPARISON_FEATURES.map((feature, index) => (
              <div
                key={feature.label}
                className={cn(
                  'grid grid-cols-[1fr_auto_auto] items-center',
                  index < COMPARISON_FEATURES.length - 1 &&
                    'border-b border-white/10'
                )}
              >
                <div className="px-4 py-4 font-[family-name:var(--font-barlow-condensed)] text-sm text-white/80">
                  {feature.label}
                </div>
                <div className="flex justify-center px-6 py-4">
                  <FeatureIcon included={feature.single} />
                </div>
                <div className="flex justify-center px-6 py-4">
                  <FeatureIcon included={feature.membership} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center font-[family-name:var(--font-bebas)] text-4xl tracking-wide text-white sm:text-5xl">
            FREQUENTLY ASKED QUESTIONS
          </h2>
          <div className="mt-12 space-y-4">
            {FAQ_ITEMS.map((item) => (
              <Card
                key={item.question}
                className="border-white/10 bg-white/5 text-white ring-white/10"
              >
                <CardHeader>
                  <CardTitle className="font-[family-name:var(--font-barlow-condensed)] text-base font-semibold text-white">
                    {item.question}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-[family-name:var(--font-barlow-condensed)] text-sm leading-relaxed text-white/60">
                    {'answer' in item ? item.answer : item.getAnswer()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
