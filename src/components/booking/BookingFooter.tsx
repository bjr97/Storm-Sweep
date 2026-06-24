'use client'

import { Button } from '@/components/ui/button'
import { useIsRetro } from '@/hooks/useTheme'
import { formatPriceDisplay, type BookingPriceBreakdown } from '@/lib/booking/pricing'
import { cn } from '@/lib/utils'

export type BookingFooterProps = {
  currentStep: number
  totalSteps: number
  pricing: BookingPriceBreakdown
  onBack: () => void
  onContinue: () => void
  continueLabel?: string
  continueDisabled?: boolean
  /** When false, only the price bar and Back button render (e.g. payment step). */
  showContinue?: boolean
}

export function BookingFooter({
  currentStep,
  totalSteps,
  pricing,
  onBack,
  onContinue,
  continueLabel = 'Continue',
  continueDisabled = false,
  showContinue = true,
}: BookingFooterProps): React.ReactElement {
  const isRetro = useIsRetro()
  const showBack = currentStep > 1
  const showContinueButton = showContinue && currentStep < totalSteps

  return (
    <div className="border-t border-border pt-6">
      <div
        className={cn(
          'mb-4 rounded-lg px-4 py-3',
          isRetro
            ? 'pixel-card border-[var(--color-border)] bg-[var(--color-surface)]'
            : 'border border-border/60 bg-white'
        )}
      >
        {pricing.isQuoteRequired ? (
          <p className="font-body text-sm text-muted-foreground">
            X-Large shelters require a custom quote. Continue to share your details and our
            team will follow up.
          </p>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between gap-4">
              <span className="font-body text-sm font-medium text-shelter">Total</span>
              <span
                className={cn(
                  'font-display text-2xl tracking-wide text-[var(--color-primary)] sm:text-3xl'
                )}
              >
                {formatPriceDisplay(pricing.total)}
              </span>
            </div>

            <div className="space-y-1.5 border-t border-border/60 pt-3">
              {pricing.lineItems.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between gap-3 font-body text-sm"
                >
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="shrink-0 font-medium text-shelter">
                    {formatPriceDisplay(item.amount)}
                  </span>
                </div>
              ))}
            </div>

            {pricing.deposit !== null ? (
              <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3 font-body text-sm">
                <span className="text-muted-foreground">Deposit due today (50%)</span>
                <span className="font-semibold text-wheat-DEFAULT">
                  {formatPriceDisplay(pricing.deposit)}
                </span>
              </div>
            ) : null}
          </>
        )}
      </div>

      <div className="flex items-center justify-between gap-4">
        {showBack ? (
          <button
            type="button"
            onClick={onBack}
            className="font-body text-sm text-muted-foreground transition-colors hover:text-shelter"
          >
            ← Back
          </button>
        ) : (
          <span aria-hidden="true" />
        )}

        {showContinueButton ? (
          <Button
            type="button"
            onClick={onContinue}
            disabled={continueDisabled}
            className={cn(
              'h-10 px-6 font-body text-sm font-semibold',
              isRetro
                ? 'pixel-btn border-[var(--color-ink)] bg-[var(--color-primary)] text-[var(--color-paper)] hover:bg-[var(--color-primary-light)]'
                : 'border-transparent bg-[#2E86C1] text-white hover:bg-[#5DADE2]'
            )}
          >
            {continueLabel}
          </Button>
        ) : (
          <span aria-hidden="true" />
        )}
      </div>
    </div>
  )
}
