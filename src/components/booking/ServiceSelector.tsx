'use client'

import { Check, Lightbulb, Package, ShieldCheck, Sparkles } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { calculateBookingPrice, formatPriceDisplay } from '@/lib/booking/pricing'
import { SHELTER_SIZE_OPTIONS, type ServiceSelectionValues } from '@/lib/booking/schemas'
import { cn, formatCurrency, PRICING, SUPPLY_KITS } from '@/lib/utils'
import type { ShelterSize } from '@/types/database'

type ServiceSelectorProps = {
  values: ServiceSelectionValues
  onChange: (values: ServiceSelectionValues) => void
}

const SUPPLY_KIT_OPTIONS = [
  { value: 'none', label: 'No supply kit' },
  { value: 'starter', label: `Starter — ${formatCurrency(PRICING.addons.supply_kit_starter)}` },
  { value: 'essential', label: `Essential — ${formatCurrency(PRICING.addons.supply_kit_essential)}` },
  { value: 'family', label: `Family — ${formatCurrency(PRICING.addons.supply_kit_family)}` },
  { value: 'pro', label: `Pro — ${formatCurrency(PRICING.addons.supply_kit_pro)}` },
  { value: 'elite', label: `Elite — ${formatCurrency(PRICING.addons.supply_kit_elite)}` },
] as const

export function ServiceSelector({ values, onChange }: ServiceSelectorProps): React.ReactElement {
  const pricing = calculateBookingPrice(values)
  const activeKitKey = values.full_package ? 'essential' : values.supply_kit

  function updateField<K extends keyof ServiceSelectionValues>(
    field: K,
    value: ServiceSelectionValues[K]
  ): void {
    onChange({ ...values, [field]: value })
  }

  function toggleFullPackage(checked: boolean): void {
    onChange(
      checked
        ? { ...values, full_package: true, led_package: true, supply_kit: 'essential' }
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
            description="Deep clean + LED lighting + Essential supply kit bundle."
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
          <div
            className={cn(
              'rounded-xl border p-4 transition-all',
              values.supply_kit !== 'none' && !values.full_package
                ? 'border-sky-DEFAULT bg-sky-pale/50'
                : 'border-border bg-white',
              values.full_package && 'opacity-60'
            )}
          >
            <div className="flex items-start gap-3">
              <Package className="mt-0.5 size-5 shrink-0 text-sky-DEFAULT" />
              <div className="flex-1 space-y-3">
                <div>
                  <p className="font-medium text-shelter">Supply Kit</p>
                  <p className="text-sm text-muted-foreground">
                    Emergency supplies stocked and organized in your shelter.
                  </p>
                </div>
                <select
                  value={values.full_package ? 'essential' : values.supply_kit}
                  disabled={values.full_package}
                  onChange={(event) =>
                    updateField('supply_kit', event.target.value as ServiceSelectionValues['supply_kit'])
                  }
                  className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {SUPPLY_KIT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {activeKitKey !== 'none' ? (
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {SUPPLY_KITS[activeKitKey].items.slice(0, 4).map((item) => (
                      <li key={item} className="flex items-center gap-1.5">
                        <Check className="size-3 text-sky-DEFAULT" />
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="font-[family-name:var(--font-bebas)] text-2xl tracking-wide text-shelter">MEMBERSHIP</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Storm Ready members get 2 visits per year and 10% off upgrades.
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

      <Card className="border-sky-DEFAULT/20 bg-white shadow-sm">
        <CardHeader className="border-b border-border/60">
          <CardTitle className="font-[family-name:var(--font-bebas)] text-xl tracking-wide text-shelter">
            PRICE SUMMARY
          </CardTitle>
          <CardDescription>50% deposit due today at checkout</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          {pricing.isQuoteRequired ? (
            <p className="text-sm text-muted-foreground">
              X-Large shelters require a custom quote. Continue to share your details and our team will follow up.
            </p>
          ) : (
            <>
              {pricing.lineItems.map((item) => (
                <div key={item.label} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-medium text-shelter">{formatPriceDisplay(item.amount)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-border pt-3">
                <span className="font-medium text-shelter">Total</span>
                <span className="font-[family-name:var(--font-bebas)] text-2xl tracking-wide text-sky-DEFAULT">
                  {formatPriceDisplay(pricing.total)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Deposit due today (50%)</span>
                <span className="font-semibold text-wheat-DEFAULT">
                  {formatPriceDisplay(pricing.deposit)}
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
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
