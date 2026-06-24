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
import { cn, formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'

export interface KitSelection {
  selectedBundle: 'storm_starter' | 'family_ready' | 'pet_ready' | 'full_house' | null
  aLaCarteItems: string[]
  ageSelector: 'infant' | 'toddler' | 'big_kid' | null
  petSizeSelector: 'small_breed' | 'large_breed' | 'cat' | null
  kitTotal: number
}

export interface KitSelectorProps {
  shelterSize: 'small' | 'standard' | 'large' | 'xlarge'
  membershipPlan: 'none' | 'annual' | 'monthly' | 'annual_2yr'
  serviceTotal: number
  onSelect: (selection: KitSelection) => void
  onSkip: () => void
  onContinue: () => void
}

const SHELTER_READY_KIT_DISCOUNT = 59

const BUNDLES = [
  {
    id: 'storm_starter',
    name: 'Storm Starter',
    emoji: '🌪️',
    price: 79,
    savings: 4,
    tagline: 'The essentials. No fluff.',
    popular: false,
    includes: ['shelter_ready', 'hygiene'],
    items: [
      'Hand-crank power bank',
      'Basic first aid kit',
      'Waterproof document pouch',
      'Laminated emergency card',
      'Mylar blankets (2)',
      'Whistle + glow sticks',
      'Toothbrush + travel toothpaste',
      'Wet wipes + hand sanitizer',
    ],
  },
  {
    id: 'family_ready',
    name: 'Family Ready',
    emoji: '👨‍👩‍👧',
    price: 89,
    savings: 23,
    tagline: 'For the household that actually has a lot going on.',
    popular: true,
    includes: ['shelter_ready', 'little_ones', 'hygiene'],
    requiresSelector: ['age'],
    items: [
      'Everything in Storm Starter',
      'Age-matched kids pack (select below)',
      'Snacks, comfort item, activity kit or infant supplies',
    ],
  },
  {
    id: 'pet_ready',
    name: 'Pet Ready',
    emoji: '🐾',
    price: 89,
    savings: 13,
    tagline: "You already know they're coming down there with you.",
    popular: false,
    includes: ['shelter_ready', 'pets', 'hygiene'],
    requiresSelector: ['pet_size'],
    items: [
      'Everything in Storm Starter',
      '2-day pet food supply',
      'Collapsible bowl + backup leash',
      'Waste bags (6-pack)',
    ],
  },
  {
    id: 'full_house',
    name: 'Full House',
    emoji: '🏠',
    price: 149,
    savings: 22,
    tagline: 'Kids, pets, adults. Every scenario. One box.',
    popular: false,
    includes: ['shelter_ready', 'little_ones', 'pets', 'hygiene'],
    requiresSelector: ['age', 'pet_size'],
    items: [
      'Everything in Storm Starter',
      'Age-matched kids pack',
      'Pet food, bowl, leash, waste bags',
    ],
  },
] as const

const A_LA_CARTE_ITEMS = [
  {
    id: 'shelter_ready',
    name: 'Shelter Ready Kit',
    emoji: '🌪️',
    price: 59,
    desc: 'Power bank, first aid, docs pouch, mylar blankets, whistle, glow sticks, wipes',
  },
  {
    id: 'little_ones',
    name: 'Little Ones',
    emoji: '🧒',
    price: 49,
    desc: 'Age-matched comfort pack — infant, toddler, or big kid',
  },
  {
    id: 'pets',
    name: 'Pets Add-on',
    emoji: '🐾',
    price: 39,
    desc: '2-day food supply, collapsible bowl, backup leash, waste bags',
  },
  {
    id: 'hygiene',
    name: 'Hygiene Pack',
    emoji: '🧼',
    price: 24,
    desc: 'Toothbrush, toothpaste, wipes, hand sanitizer, tissues, waste bags',
  },
]

type BundleId = (typeof BUNDLES)[number]['id']
type AgeSelector = NonNullable<KitSelection['ageSelector']>
type PetSizeSelector = NonNullable<KitSelection['petSizeSelector']>

function getDisplayPrice(
  price: number,
  membershipPlan: KitSelectorProps['membershipPlan']
): number {
  return membershipPlan === 'annual_2yr' ? price - SHELTER_READY_KIT_DISCOUNT : price
}

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
  const bundle = BUNDLES.find((b) => b.id === bundleId)
  if (!bundle || !('requiresSelector' in bundle)) return false
  return (bundle.requiresSelector as readonly string[]).includes(selector)
}

export function KitSelector({
  shelterSize,
  membershipPlan,
  serviceTotal,
  onSelect,
  onSkip,
  onContinue,
}: KitSelectorProps): React.ReactElement {
  const [selectedBundle, setSelectedBundle] = useState<KitSelection['selectedBundle']>(null)
  const [aLaCarteItems, setALaCarteItems] = useState<string[]>([])
  const [showALaCarte, setShowALaCarte] = useState(false)
  const [ageSelector, setAgeSelector] = useState<KitSelection['ageSelector']>(null)
  const [petSizeSelector, setPetSizeSelector] = useState<KitSelection['petSizeSelector']>(null)
  const [showSkipMessage, setShowSkipMessage] = useState(false)

  const has2yrPlan = membershipPlan === 'annual_2yr'

  const activeBundle = selectedBundle ? BUNDLES.find((b) => b.id === selectedBundle) : null

  function calculateALaCarteTotal(items: string[]): number {
    let total = items.reduce((sum, id) => {
      const item = A_LA_CARTE_ITEMS.find((i) => i.id === id)
      return sum + (item?.price ?? 0)
    }, 0)
    if (has2yrPlan && items.includes('shelter_ready')) {
      total -= SHELTER_READY_KIT_DISCOUNT
    }
    return total
  }

  const kitTotal = selectedBundle
    ? (activeBundle?.price ?? 0)
    : calculateALaCarteTotal(aLaCarteItems)

  const showAgeSelector =
    bundleIncludes(activeBundle, 'little_ones') || aLaCarteItems.includes('little_ones')
  const showPetSizeSelector =
    bundleIncludes(activeBundle, 'pets') || aLaCarteItems.includes('pets')

  const needsAge =
    bundleRequiresSelector(selectedBundle, 'age') || aLaCarteItems.includes('little_ones')

  const needsPetSize =
    bundleRequiresSelector(selectedBundle, 'pet_size') || aLaCarteItems.includes('pets')

  const hasKitSelected = selectedBundle !== null || aLaCarteItems.length > 0
  const canContinue =
    !hasKitSelected ||
    ((!needsAge || ageSelector !== null) && (!needsPetSize || petSizeSelector !== null))

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

  function tryAutoBundle(items: string[]): boolean {
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
      `Nice — we switched you to ${matchedBundle.name} and saved you $${matchedBundle.savings}! 🎉`
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

  function handleALaCarteToggle(itemId: string): void {
    if (has2yrPlan && itemId === 'shelter_ready') return

    const next = aLaCarteItems.includes(itemId)
      ? aLaCarteItems.filter((id) => id !== itemId)
      : [...aLaCarteItems, itemId]

    if (tryAutoBundle(next)) return

    setALaCarteItems(next)
  }

  function handleBundleSelect(bundleId: BundleId): void {
    setSelectedBundle(selectedBundle === bundleId ? null : bundleId)
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
    <>
    <div className="space-y-6 bg-[#F7F7F4] pb-24 font-['Barlow']">
      <section>
        <h2 className="font-['Barlow_Condensed'] text-2xl font-semibold text-shelter">
          Prep your shelter while we&apos;re there.
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your Sweeper can install your kit same visit. No extra trip.
        </p>
      </section>

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
                    {formatCurrency(getDisplayPrice(bundle.price, membershipPlan))}
                  </span>
                  <Badge className="rounded bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 hover:bg-green-100">
                    save ${bundle.savings}
                  </Badge>
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
            No worries — you can always add a kit after your visit from your customer portal.
          </p>
        )}
      </div>
    </div>

    <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between border-t border-gray-200 bg-white px-6 py-4 shadow-lg">
      <div className="flex items-center gap-3 font-['Barlow'] text-sm text-gray-600">
        <span>
          Service <strong className="text-gray-900">${serviceTotal}</strong>
        </span>
        {kitTotal > 0 ? (
          <>
            <span className="text-gray-300">+</span>
            <span>
              Kit <strong className="text-gray-900">${kitTotal}</strong>
            </span>
            <span className="text-gray-300">=</span>
            <span className="text-base font-bold text-gray-900">${serviceTotal + kitTotal}</span>
          </>
        ) : (
          <span className="ml-2 text-xs text-gray-400">No kit selected</span>
        )}
      </div>

      <Button
        type="button"
        onClick={onContinue}
        disabled={!canContinue}
        className="bg-[#2E86C1] px-8 text-white hover:bg-[#1A5276]"
      >
        Continue →
      </Button>
    </div>
    </>
  )
}
