'use client'

import { Lightbulb, ShieldCheck, Sparkles } from 'lucide-react'

import { SHELTER_SIZE_OPTIONS, type ServiceSelectionValues } from '@/lib/booking/schemas'
import { cn, formatCurrency, PREP_KIT_BUNDLES, PRICING } from '@/lib/utils'
import type { ShelterSize } from '@/types/database'

type ServiceSelectorProps = {
  values: ServiceSelectionValues
  onChange: (values: ServiceSelectionValues) => void
}

const FULL_PACKAGE_KIT_NAME =
  PREP_KIT_BUNDLES.find((bundle) => bundle.id === PRICING.full_package_kit)?.name ?? 'prep kit'

export function ServiceSelector({ values, onChange }: ServiceSelectorProps): React.ReactElement {
  function updateField<K extends keyof ServiceSelectionValues>(
    field: K,
    value: ServiceSelectionValues[K]
  ): void {
    onChange({ ...values, [field]: value })
  }

  function toggleFullPackage(checked: boolean): void {
    onChange(
      checked
        ? { ...values, full_package: true, led_package: true }
        : { ...values, full_package: false }
    )
  }

  function getShelterPriceLabel(size: ShelterSize): string {
    const price = PRICING.shelter[size]
    return price === null ? 'Quote' : formatCurrency(price)
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="font-[family-name:var(--font-bebas)] text-2xl tracking-wide text-shelter">
          CHOOSE YOUR SHELTER SIZE
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Deep clean pricing varies by shelter size. All visits include our full scrub, vacuum, and mold treatment.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {SHELTER_SIZE_OPTIONS.map((option) => {
            const selected = values.shelter_size === option.value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => updateField('shelter_size', option.value)}
                className={cn(
                  'rounded-xl border p-4 text-left transition-all',
                  selected
                    ? 'border-sky-DEFAULT bg-sky-pale ring-2 ring-sky-DEFAULT/30'
                    : 'border-border bg-white hover:border-sky-DEFAULT/50'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-[family-name:var(--font-bebas)] text-lg tracking-wide text-shelter">
                      {option.label.toUpperCase()}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{option.description}</p>
                  </div>
                  <span className="shrink-0 font-semibold text-sky-DEFAULT">
                    {getShelterPriceLabel(option.value)}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </section>

      <section>
        <h2 className="font-[family-name:var(--font-bebas)] text-2xl tracking-wide text-shelter">ADD SERVICES</h2>
        <div className="mt-4 space-y-3">
          <ServiceRow
            icon={<Sparkles className="mt-0.5 size-5 text-sky-DEFAULT" />}
            title="Deep Clean"
            description="Included with every visit — full scrub, vacuum, mold treatment, and deodorizer."
            priceLabel="Included"
            checked={values.deep_clean}
            disabled
          />
          <ServiceRow
            icon={<ShieldCheck className="mt-0.5 size-5 text-wheat-DEFAULT" />}
            title="Full Package"
            description={`Deep clean + LED lighting + ${FULL_PACKAGE_KIT_NAME} prep kit. Upgrade the kit in the next step.`}
            priceLabel={formatCurrency(PRICING.bundles.full_package)}
            checked={values.full_package}
            onCheckedChange={toggleFullPackage}
            highlight="wheat"
          />
          <ServiceRow
            icon={<Lightbulb className="mt-0.5 size-5 text-sky-DEFAULT" />}
            title="LED Package"
            description="Bright, reliable LED upgrade for your shelter."
            priceLabel={`+${formatCurrency(PRICING.addons.led_package)}`}
            checked={values.led_package || values.full_package}
            disabled={values.full_package}
            onCheckedChange={(checked) => updateField('led_package', checked)}
          />
        </div>
      </section>

      <section>
        <h2 className="font-[family-name:var(--font-bebas)] text-2xl tracking-wide text-shelter">MEMBERSHIP</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Storm Ready includes {PRICING.membership.visits_per_year} cleanings a year — today&apos;s
          visit is your first, so the clean is covered (large shelters pay the size
          difference). Members also get 10% off upgrades. Monthly is a{' '}
          {PRICING.membership.monthly_commitment_months}-month commitment.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            { value: 'one_time' as const, label: 'One-Time Visit', price: null },
            { value: 'annual' as const, label: 'Storm Ready Annual', price: PRICING.membership.annual },
            { value: 'monthly' as const, label: 'Storm Ready Monthly', price: PRICING.membership.monthly },
          ].map((option) => {
            const selected = values.membership === option.value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => updateField('membership', option.value)}
                className={cn(
                  'rounded-xl border p-4 text-left transition-all',
                  selected
                    ? 'border-wheat-DEFAULT bg-wheat-pale ring-2 ring-wheat-DEFAULT/30'
                    : 'border-border bg-white hover:border-wheat-DEFAULT/50'
                )}
              >
                <p className="font-medium text-shelter">{option.label}</p>
                <p className="mt-1 text-sm font-semibold text-wheat-DEFAULT">
                  {option.price === null
                    ? 'Pay per visit'
                    : option.value === 'monthly'
                      ? `${formatCurrency(option.price)}/mo`
                      : `${formatCurrency(option.price)}/yr`}
                </p>
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}

type ServiceRowProps = {
  icon: React.ReactNode
  title: string
  description: string
  priceLabel: string
  checked: boolean
  disabled?: boolean
  highlight?: 'wheat' | 'sky'
  onCheckedChange?: (checked: boolean) => void
}

function ServiceRow({
  icon,
  title,
  description,
  priceLabel,
  checked,
  disabled,
  highlight,
  onCheckedChange,
}: ServiceRowProps): React.ReactElement {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-all',
        checked && highlight === 'wheat'
          ? 'border-wheat-DEFAULT bg-wheat-pale/40'
          : checked
            ? 'border-sky-DEFAULT bg-sky-pale/50'
            : 'border-border bg-white hover:border-sky-DEFAULT/50',
        disabled && 'pointer-events-none opacity-60'
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onCheckedChange?.(event.target.checked)}
        className={cn('mt-1 size-4', highlight === 'wheat' ? 'accent-wheat-DEFAULT' : 'accent-sky-DEFAULT')}
      />
      <div className="flex flex-1 items-start justify-between gap-3">
        <div className="flex gap-3">
          {icon}
          <div>
            <p className="font-medium text-shelter">{title}</p>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <span
          className={cn(
            'font-semibold',
            highlight === 'wheat' ? 'text-wheat-DEFAULT' : 'text-sky-DEFAULT',
            priceLabel === 'Included' && 'text-sm font-medium text-muted-foreground'
          )}
        >
          {priceLabel}
        </span>
      </div>
    </label>
  )
}
