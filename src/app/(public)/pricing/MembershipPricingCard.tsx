'use client'

import Link from 'next/link'
import { useState } from 'react'

import { buttonVariants } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn, formatCurrency, PRICING } from '@/lib/utils'

type BillingPlan = 'annual' | 'monthly'

export function MembershipPricingCard(): React.ReactElement {
  const [plan, setPlan] = useState<BillingPlan>('annual')

  const price =
    plan === 'annual'
      ? PRICING.membership.annual
      : PRICING.membership.monthly
  const priceSuffix = plan === 'annual' ? '/yr' : '/mo'
  const bookHref =
    plan === 'annual' ? '/book?membership=annual' : '/book?membership=monthly'

  return (
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
        <div className="inline-flex rounded-lg border border-white/10 bg-black/30 p-1">
          <button
            type="button"
            onClick={() => setPlan('annual')}
            className={cn(
              'rounded-md px-4 py-2 font-[family-name:var(--font-barlow-condensed)] text-sm font-semibold uppercase tracking-wide transition-colors',
              plan === 'annual'
                ? 'bg-wheat-DEFAULT text-shelter'
                : 'text-white/70 hover:text-white'
            )}
          >
            Annual
          </button>
          <button
            type="button"
            onClick={() => setPlan('monthly')}
            className={cn(
              'rounded-md px-4 py-2 font-[family-name:var(--font-barlow-condensed)] text-sm font-semibold uppercase tracking-wide transition-colors',
              plan === 'monthly'
                ? 'bg-wheat-DEFAULT text-shelter'
                : 'text-white/70 hover:text-white'
            )}
          >
            Monthly
          </button>
        </div>

        <p className="font-[family-name:var(--font-bebas)] text-5xl tracking-wide text-wheat-DEFAULT">
          {formatCurrency(price)}
          <span className="text-2xl text-white/60">{priceSuffix}</span>
        </p>

        {plan === 'monthly' ? (
          <p className="font-[family-name:var(--font-barlow-condensed)] text-xs text-white/50">
            Billed monthly. Cancel anytime from your customer portal.
          </p>
        ) : (
          <p className="font-[family-name:var(--font-barlow-condensed)] text-xs text-white/50">
            Save vs. monthly billing — best value for year-round peace of mind.
          </p>
        )}

        <ul className="space-y-2 font-[family-name:var(--font-barlow-condensed)] text-sm text-white/70">
          <li>· 2 scheduled visits per year</li>
          <li>· Priority booking before storm season</li>
          <li>· 10% off all upgrades &amp; add-ons</li>
          <li>· Photo report after every visit</li>
        </ul>

        <Link
          href={bookHref}
          className={cn(
            buttonVariants({ size: 'lg' }),
            'mt-4 h-11 w-full bg-wheat-DEFAULT text-shelter hover:bg-wheat-light'
          )}
        >
          Book Now
        </Link>
      </CardContent>
    </Card>
  )
}
