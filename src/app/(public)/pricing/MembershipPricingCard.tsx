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
    <Card className="border-[var(--color-accent)]/40 bg-[var(--color-accent)]/5 text-[var(--color-text)] ring-[var(--color-accent)]/20">
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
        <div className="inline-flex rounded-lg border border-[color-mix(in_srgb,var(--color-border)_40%,transparent)] bg-black/30 p-1">
          <button
            type="button"
            onClick={() => setPlan('annual')}
            className={cn(
              'rounded-md px-4 py-2 font-body text-sm font-semibold uppercase tracking-wide transition-colors',
              plan === 'annual'
                ? 'bg-[var(--color-accent)] text-[var(--color-bg)]'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            )}
          >
            Annual
          </button>
          <button
            type="button"
            onClick={() => setPlan('monthly')}
            className={cn(
              'rounded-md px-4 py-2 font-body text-sm font-semibold uppercase tracking-wide transition-colors',
              plan === 'monthly'
                ? 'bg-[var(--color-accent)] text-[var(--color-bg)]'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            )}
          >
            Monthly
          </button>
        </div>

        <p className="font-display text-5xl tracking-wide text-[var(--color-accent)]">
          {formatCurrency(price)}
          <span className="text-2xl text-[var(--color-text-muted)]">{priceSuffix}</span>
        </p>

        {plan === 'monthly' ? (
          <p className="font-body text-xs text-[var(--color-text-muted)]">
            Billed monthly. Cancel anytime from your customer portal.
          </p>
        ) : (
          <p className="font-body text-xs text-[var(--color-text-muted)]">
            Save vs. monthly billing — best value for year-round peace of mind.
          </p>
        )}

        <ul className="space-y-2 font-body text-sm text-[var(--color-text-muted)]">
          <li>· 2 scheduled visits per year</li>
          <li>· Priority booking before storm season</li>
          <li>· 10% off all upgrades &amp; add-ons</li>
          <li>· Photo report after every visit</li>
        </ul>

        <Link
          href={bookHref}
          className={cn(
            buttonVariants({ size: 'lg' }),
            'mt-4 h-11 w-full bg-[var(--color-accent)] text-[var(--color-bg)] hover:opacity-90'
          )}
        >
          Book Now
        </Link>
      </CardContent>
    </Card>
  )
}
