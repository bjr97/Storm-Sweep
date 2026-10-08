'use client'

import { CheckCircle2 } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  getPrepKitBundle,
  priceKitSelection,
  type KitMembershipPlan,
  type KitSelection,
} from '@/lib/booking/prepKits'
import {
  cn,
  formatCurrency,
  PREP_KIT_BUNDLES,
  PREP_KIT_ITEMS,
  prepKitBundleSavings,
  type PrepKitBundleId,
  type PrepKitItemId,
} from '@/lib/utils'
import { toast } from 'sonner'

export type { KitSelection } from '@/lib/booking/prepKits'

export interface KitSelectorProps {
  shelterSize: 'small' | 'standard' | 'large' | 'xlarge'
  membershipPlan: KitMembershipPlan
  /** Bundle already included (Full Package). Pre-selected and credited. */
  includedBundle?: PrepKitBundleId | null
  onSelect: (selection: KitSelection) => void
  onSkip: () => void
}

const BUNDLES = PREP_KIT_BUNDLES
const A_LA_CARTE_ITEMS = PREP_KIT_ITEMS

type BundleId = (typeof BUNDLES)[number]['id']
type AgeSelector = NonNullable<KitSelection['ageSelector']>
type PetSizeSelector = NonNullable<KitSelection['petSizeSelector']>

function bundleIncludes(
  bundle: (typeof BUNDLES)[number] | null | undefined,
  item: string
): boolean {
  if (!bundle) return false
  return (bundle.includes as readonly string[]).includes(item)
}

function bundleRequiresSelector(
  bundleId: KitSelection['selectedBundle'],
  selector: 'age' | 'pet_size'
): boolean {
  if (!bundleId) return false
  return (getPrepKitBundle(bundleId).requiresSelector as readonly string[]).includes(selector)
}

export function canProceedWithKit(kitSelection: KitSelection): boolean {
  const hasKitSelected =
    kitSelection.selectedBundle !== null || kitSelection.aLaCarteItems.length > 0

  if (!hasKitSelected) {
    return true
  }

  const needsAge =
    bundleRequiresSelector(kitSelection.selectedBundle, 'age') ||
    kitSelection.aLaCarteItems.includes('little_ones')

  const needsPetSize =
    bundleRequiresSelector(kitSelection.selectedBundle, 'pet_size') ||
    kitSelection.aLaCarteItems.includes('pets')

  return (
    (!needsAge || kitSelection.ageSelector !== null) &&
    (!needsPetSize || kitSelection.petSizeSelector !== null)
  )
}

export function KitSelector({
  shelterSize,
  membershipPlan,
  includedBundle = null,
  onSelect,
  onSkip,
}: KitSelectorProps): React.ReactElement {
  const [selectedBundle, setSelectedBundle] =
    useState<KitSelection['selectedBundle']>(includedBundle)
  const [aLaCarteItems, setALaCarteItems] = useState<PrepKitItemId[]>([])
  const [showALaCarte, setShowALaCarte] = useState(false)
  const [ageSelector, setAgeSelector] = useState<KitSelection['ageSelector']>(null)
  const [petSizeSelector, setPetSizeSelector] = useState<KitSelection['petSizeSelector']>(null)
  const [showSkipMessage, setShowSkipMessage] = useState(false)

  const has2yrPlan = membershipPlan === 'annual_2yr'

  const activeBundle = selectedBundle ? BUNDLES.find((b) => b.id === selectedBundle) : null

  const pricingOptions = { membershipPlan, includedBundle }

  function calculateALaCarteTotal(items: PrepKitItemId[]): number {
    return priceKitSelection({ selectedBundle: null, aLaCarteItems: items }, pricingOptions).total
  }

  function bundleDisplayPrice(bundleId: PrepKitBundleId): number {
    return priceKitSelection({ selectedBundle: bundleId, aLaCarteItems: [] }, pricingOptions)
      .total
  }

  const kitTotal = priceKitSelection({ selectedBundle, aLaCarteItems }, pricingOptions).total

  const showAgeSelector =
    bundleIncludes(activeBundle, 'little_ones') || aLaCarteItems.includes('little_ones')
  const showPetSizeSelector =
    bundleIncludes(activeBundle, 'pets') || aLaCarteItems.includes('pets')

  useEffect(() => {
    if (!showAgeSelector && ageSelector !== null) {
      setAgeSelector(null)
    }
  }, [showAgeSelector, ageSelector])

  useEffect(() => {
    if (!showPetSizeSelector && petSizeSelector !== null) {
      setPetSizeSelector(null)
    }
  }, [showPetSizeSelector, petSizeSelector])

  useEffect(() => {
    onSelect({
      selectedBundle,
      aLaCarteItems,
      ageSelector,
      petSizeSelector,
      kitTotal,
    })
  }, [selectedBundle, aLaCarteItems, ageSelector, petSizeSelector, kitTotal, onSelect])

  function tryAutoBundle(items: PrepKitItemId[]): boolean {
    const sorted = [...items].sort()
    const matchedBundle = BUNDLES.find((bundle) => {
      const includes = [...bundle.includes].sort()
      return (
        sorted.length === includes.length && sorted.every((id, index) => id === includes[index])
      )
    })

    if (!matchedBundle) return false

    setSelectedBundle(matchedBundle.id)
    setALaCarteItems([])
    setShowALaCarte(false)
    toast.success(
      `Nice — we switched you to ${matchedBundle.name} and saved you ${formatCurrency(prepKitBundleSavings(matchedBundle))}! 🎉`
    )
    return true
  }

  function handleBuildYourOwnClick(): void {
    if (selectedBundle) {
      setSelectedBundle(null)
    }

    const nextShow = !showALaCarte
    setShowALaCarte(nextShow)

    if (nextShow && has2yrPlan && !aLaCarteItems.includes('shelter_ready')) {
      setALaCarteItems([...aLaCarteItems, 'shelter_ready'])
    }
  }

  function handleALaCarteToggle(itemId: PrepKitItemId): void {
    if (has2yrPlan && itemId === 'shelter_ready') return

    const next = aLaCarteItems.includes(itemId)
      ? aLaCarteItems.filter((id) => id !== itemId)
      : [...aLaCarteItems, itemId]

    if (tryAutoBundle(next)) return

    setALaCarteItems(next)
  }

  function handleBundleSelect(bundleId: BundleId): void {
    if (selectedBundle === bundleId) {
      // The Full Package kit can be swapped for an upgrade, but not removed.
      if (bundleId !== includedBundle) {
        setSelectedBundle(includedBundle)
      }
      return
    }
    setSelectedBundle(bundleId)
  }

  function handleAgeChange(value: AgeSelector): void {
    setAgeSelector(value)
  }

  function handlePetSizeChange(value: PetSizeSelector): void {
    setPetSizeSelector(value)
  }

  function handleSkip(): void {
    setShowSkipMessage(true)
    window.setTimeout(() => {
      onSkip()
    }, 1500)
  }

  return (
    <div className="space-y-6 font-['Barlow']">
      <section>
        <h2 className="font-['Barlow_Condensed'] text-2xl font-semibold text-shelter">
          Prep your shelter while we&apos;re there.
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your Sweeper can install your kit same visit. No extra trip.
        </p>
      </section>

      {includedBundle ? (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Your Full Package already includes the {getPrepKitBundle(includedBundle).name} kit.
          Want more? Upgrade below and pay only the difference.
        </div>
      ) : null}

      {has2yrPlan ? (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          🎉 Your 2-year plan includes the Shelter Ready Kit free — already applied to all
          bundles below.
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {BUNDLES.map((bundle) => {
          const isSelected = selectedBundle === bundle.id
          const showLargeHouseholdTag =
            (shelterSize === 'large' || shelterSize === 'xlarge') && bundle.id === 'full_house'

          return (
            <Card
              key={bundle.id}
              className={cn(
                'relative bg-white',
                isSelected && 'border-2 border-[#2E86C1] ring-2 ring-[#2E86C1]/20'
              )}
            >
              {isSelected ? (
                <CheckCircle2 className="absolute right-3 top-3 size-5 text-[#2E86C1]" />
              ) : null}

              <CardContent className="flex flex-col gap-3 pt-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-['Barlow_Condensed'] text-lg font-semibold text-shelter">
                    {bundle.emoji} {bundle.name}
                  </span>
                  {bundle.popular ? (
                    <Badge className="rounded bg-[#2E86C1] px-2 py-0.5 text-xs text-white hover:bg-[#2E86C1]">
                      Most Popular
                    </Badge>
                  ) : null}
                  {showLargeHouseholdTag ? (
                    <Badge className="rounded bg-amber-50 px-2 py-0.5 text-xs text-amber-700 hover:bg-amber-50">
                      Popular for larger households
                    </Badge>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-['Barlow_Condensed'] text-3xl font-bold text-shelter">
                    {bundle.id === includedBundle
                      ? 'Included'
                      : `${includedBundle ? '+' : ''}${formatCurrency(bundleDisplayPrice(bundle.id))}`}
                  </span>
                  {bundle.id === includedBundle ? (
                    <Badge className="rounded bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 hover:bg-green-100">
                      with Full Package
                    </Badge>
                  ) : includedBundle ? null : (
                    <Badge className="rounded bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 hover:bg-green-100">
                      save {formatCurrency(prepKitBundleSavings(bundle))}
                    </Badge>
                  )}
                </div>

                <p className="text-sm text-muted-foreground">{bundle.tagline}</p>

                <ul className="space-y-1 text-sm text-gray-600">
                  {bundle.items.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="text-gray-400">•</span>
                      {item}
                    </li>
                  ))}
                </ul>

                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "mt-auto w-full font-['Barlow_Condensed']",
                    isSelected && 'border-[#2E86C1] bg-[#2E86C1] text-white hover:bg-[#2E86C1]/90 hover:text-white'
                  )}
                  onClick={() => handleBundleSelect(bundle.id)}
                >
                  SELECT
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div id="a-la-carte-section">
        <button
          type="button"
          onClick={handleBuildYourOwnClick}
          className="cursor-pointer text-sm text-gray-400 underline hover:text-gray-600"
        >
          Build your own instead →
        </button>

        {showALaCarte ? (
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-500">Build your own kit</h3>
              <span className="text-sm font-semibold text-shelter">
                Subtotal: {formatCurrency(calculateALaCarteTotal(aLaCarteItems))}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {A_LA_CARTE_ITEMS.map((item) => {
                const isShelterIncluded = has2yrPlan && item.id === 'shelter_ready'
                const isChecked = isShelterIncluded || aLaCarteItems.includes(item.id)

                return (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleALaCarteToggle(item.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleALaCarteToggle(item.id)
                      }
                    }}
                    className={cn(
                      'flex cursor-pointer gap-3 rounded-lg border bg-white p-3 transition-colors',
                      isShelterIncluded && 'border-green-300 bg-green-50',
                      isChecked && !isShelterIncluded && 'border-[#2E86C1] bg-blue-50',
                      !isChecked && 'border-border'
                    )}
                  >
                    <Checkbox
                      checked={isChecked}
                      disabled={isShelterIncluded}
                      onCheckedChange={() => handleALaCarteToggle(item.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-0.5"
                    />
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-shelter">
                          {item.emoji} {item.name}
                        </span>
                        <span className="shrink-0 text-sm font-semibold text-[#2E86C1]">
                          {isShelterIncluded ? '$0 (included)' : formatCurrency(item.price)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">{item.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : null}
      </div>

      {showAgeSelector ? (
        <div className="mt-4 rounded-md border border-[#2E86C1] bg-blue-50 p-4">
          <label className="mb-2 block font-['Barlow_Condensed'] text-sm font-semibold text-gray-700">
            How old is your little one?
          </label>
          <Select
            value={ageSelector ?? ''}
            onValueChange={(v) => handleAgeChange(v as AgeSelector)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select age range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="infant">Infant (0–12 months)</SelectItem>
              <SelectItem value="toddler">Toddler (1–4 years)</SelectItem>
              <SelectItem value="big_kid">Big Kid (5–10 years)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {showPetSizeSelector ? (
        <div className="mt-3 rounded-md border border-[#2E86C1] bg-blue-50 p-4">
          <label className="mb-2 block font-['Barlow_Condensed'] text-sm font-semibold text-gray-700">
            What kind of pet?
          </label>
          <Select
            value={petSizeSelector ?? ''}
            onValueChange={(v) => handlePetSizeChange(v as PetSizeSelector)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select pet type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="small_breed">Small Breed Dog</SelectItem>
              <SelectItem value="large_breed">Large Breed Dog</SelectItem>
              <SelectItem value="cat">Cat</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <div className="mt-6 flex flex-col items-start gap-2">
        {!showSkipMessage ? (
          <button
            type="button"
            onClick={handleSkip}
            className="cursor-pointer border-none bg-transparent p-0 text-sm text-gray-400 underline hover:text-gray-600"
          >
            Skip for now
          </button>
        ) : (
          <p className="text-sm italic text-gray-500">
            No worries — you can add a kit when you book your next visit.
          </p>
        )}
      </div>
    </div>
  )
}
