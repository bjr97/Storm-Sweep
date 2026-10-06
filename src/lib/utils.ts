import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

/**
 * All money amounts are integer CENTS — in PRICING, in the database, and in
 * every calculation. Convert only at the edges: formatCurrency() for display,
 * centsToDollarString() for PayPal. Stripe takes cents directly.
 */
export const PRICING = {
  shelter: {
    small: 12900,
    standard: 14900,
    large: 17900,
    xlarge: null,
  },
  addons: {
    led_package: 8900,
    interior_handle: 4500,
    hinge_service: 3500,
    lock_replacement: 6500,
    extension_cord: 1500,
  },
  /** Prep kits (booking Step 2). Catalog details live in PREP_KIT_BUNDLES / PREP_KIT_ITEMS. */
  kits: {
    storm_starter: 7900,
    family_ready: 8900,
    pet_ready: 8900,
    full_house: 14900,
    shelter_ready: 5900,
    little_ones: 4900,
    pets: 3900,
    hygiene: 2400,
  },
  membership: {
    annual: 24900,
    monthly: 2400,
    /** Cleanings included per membership year. The visit booked at signup is #1. */
    visits_per_year: 2,
    /** Membership covers cleans up to this size; larger shelters pay the difference. */
    covered_shelter_size: 'standard',
    /** Monthly plan is a payment plan on a 12-month term. */
    monthly_commitment_months: 12,
  },
  bundles: {
    clean_plus_led: 21900,
    /** Standard clean + LED + Storm Starter kit (size-adjusted for small/large). */
    full_package: 29900,
  },
  /** Prep kit included free with the Full Package. */
  full_package_kit: 'storm_starter',
  sweeper: {
    base_pct: 0.6,
    accept_1hr_pct: 0.68,
    accept_4hr_pct: 0.64,
    accept_24hr_pct: 0.62,
    turnaround_same_day: 2500,
    turnaround_day_1: 2000,
    turnaround_day_2: 1000,
    turnaround_day_3: 500,
    upgrade_commission: 1500,
    video_bonus: 1000,
  },
  referral: {
    customer_credit: 2500,
    partner_roofing: 2000,
    partner_realtor: 2500,
    partner_lawn: 1500,
  },
  member_upgrade_discount_pct: 0.1,
  deposit_pct: 0.5,
} as const

/** Rounds a cents amount to a whole cent (use after applying any percentage). */
export function roundCents(amount: number): number {
  return Math.round(amount)
}

/** 50% deposit, rounded to the cent. The balance is always total - deposit. */
export function calculateDeposit(totalCents: number): number {
  return roundCents(totalCents * PRICING.deposit_pct)
}

export type PrepKitBundleId = 'storm_starter' | 'family_ready' | 'pet_ready' | 'full_house'
export type PrepKitItemId = 'shelter_ready' | 'little_ones' | 'pets' | 'hygiene'

export const PREP_KIT_BUNDLES = [
  {
    id: 'storm_starter',
    name: 'Storm Starter',
    emoji: '🌪️',
    price: PRICING.kits.storm_starter,
    tagline: 'The essentials. No fluff.',
    popular: false,
    includes: ['shelter_ready', 'hygiene'],
    requiresSelector: [],
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
    price: PRICING.kits.family_ready,
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
    price: PRICING.kits.pet_ready,
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
    price: PRICING.kits.full_house,
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
] as const satisfies readonly {
  id: PrepKitBundleId
  includes: readonly PrepKitItemId[]
  requiresSelector: readonly ('age' | 'pet_size')[]
  [key: string]: unknown
}[]

export const PREP_KIT_ITEMS = [
  {
    id: 'shelter_ready',
    name: 'Shelter Ready Kit',
    emoji: '🌪️',
    price: PRICING.kits.shelter_ready,
    desc: 'Power bank, first aid, docs pouch, mylar blankets, whistle, glow sticks, wipes',
  },
  {
    id: 'little_ones',
    name: 'Little Ones',
    emoji: '🧒',
    price: PRICING.kits.little_ones,
    desc: 'Age-matched comfort pack — infant, toddler, or big kid',
  },
  {
    id: 'pets',
    name: 'Pets Add-on',
    emoji: '🐾',
    price: PRICING.kits.pets,
    desc: '2-day food supply, collapsible bowl, backup leash, waste bags',
  },
  {
    id: 'hygiene',
    name: 'Hygiene Pack',
    emoji: '🧼',
    price: PRICING.kits.hygiene,
    desc: 'Toothbrush, toothpaste, wipes, hand sanitizer, tissues, waste bags',
  },
] as const satisfies readonly { id: PrepKitItemId; price: number; [key: string]: unknown }[]

/** What a bundle saves vs. buying its à la carte items separately, in cents. */
export function prepKitBundleSavings(bundle: (typeof PREP_KIT_BUNDLES)[number]): number {
  const separate = bundle.includes.reduce(
    (sum, id) => sum + (PREP_KIT_ITEMS.find((item) => item.id === id)?.price ?? 0),
    0
  )
  return separate - bundle.price
}

export type ChecklistItem = {
  id: string
  phase: number
  label: string
  required: boolean
  photo?: boolean
  upsell?: string
}

export const CHECKLIST_ITEMS: ChecklistItem[] = [
  { id: 'arrive_01', phase: 1, label: 'Confirm en route text sent', required: true },
  {
    id: 'arrive_02',
    phase: 1,
    label: 'Take BEFORE photo — exterior hatch',
    required: true,
    photo: true,
  },
  {
    id: 'arrive_03',
    phase: 1,
    label: 'Take BEFORE photo — interior wide shot',
    required: true,
    photo: true,
  },
  {
    id: 'arrive_04',
    phase: 1,
    label: 'Check for standing water or structural hazard',
    required: true,
  },
  { id: 'arrive_05', phase: 1, label: 'Note shelter size in app', required: false },
  { id: 'arrive_06', phase: 1, label: 'Note any pest presence', required: false },
  {
    id: 'clean_01',
    phase: 2,
    label: 'Remove debris and trash — bag for customer review',
    required: true,
  },
  { id: 'clean_02', phase: 2, label: 'Vacuum ceiling and walls top-down', required: false },
  {
    id: 'clean_03',
    phase: 2,
    label: 'Vacuum floor — all corners and step areas',
    required: false,
  },
  { id: 'clean_04', phase: 2, label: 'Apply mold/mildew spray — dwell 5 minutes', required: true },
  { id: 'clean_05', phase: 2, label: 'Scrub walls and ceiling with stiff brush', required: false },
  { id: 'clean_06', phase: 2, label: 'Scrub floor — treads and corners', required: false },
  { id: 'clean_07', phase: 2, label: 'Rinse walls and floor', required: false },
  { id: 'clean_08', phase: 2, label: 'Apply deodorizer', required: false },
  { id: 'clean_09', phase: 2, label: 'Clean door hatch interior and hinges', required: false },
  {
    id: 'inspect_01',
    phase: 3,
    label: 'Inspect hatch door — damage, rust, warping',
    required: true,
    upsell: 'door',
  },
  {
    id: 'inspect_02',
    phase: 3,
    label: 'Test hinges — open/close fully',
    required: true,
    upsell: 'door',
  },
  { id: 'inspect_03', phase: 3, label: 'Test interior lock mechanism', required: true },
  {
    id: 'inspect_04',
    phase: 3,
    label: 'Check interior handle — present?',
    required: true,
    upsell: 'handle',
  },
  { id: 'inspect_05', phase: 3, label: 'Check existing lighting', required: true, upsell: 'led' },
  {
    id: 'inspect_06',
    phase: 3,
    label: 'Check walls for cracks or water intrusion',
    required: true,
    photo: true,
  },
  {
    id: 'inspect_07',
    phase: 3,
    label: 'Note emergency supplies present',
    required: false,
    upsell: 'kit',
  },
  { id: 'inspect_08', phase: 3, label: 'Log all upgrade opportunities in app', required: true },
  {
    id: 'wrap_01',
    phase: 4,
    label: 'Take AFTER photo — interior wide shot',
    required: true,
    photo: true,
  },
  {
    id: 'wrap_02',
    phase: 4,
    label: 'Take AFTER photo — exterior hatch',
    required: true,
    photo: true,
  },
  { id: 'wrap_03', phase: 4, label: 'Upload all photos before leaving property', required: true },
  {
    id: 'wrap_04',
    phase: 4,
    label: 'Walk customer to shelter — show finished work',
    required: true,
  },
  { id: 'wrap_05', phase: 4, label: 'Present upgrade recommendations verbally', required: false },
  { id: 'wrap_06', phase: 4, label: 'Get customer digital signature', required: true },
  { id: 'wrap_07', phase: 4, label: 'Mark job complete in app', required: true },
]

/** Formats integer cents for display: 14900 → "$149", 8010 → "$80.10". */
export function formatCurrency(cents: number): string {
  const wholeDollars = cents % 100 === 0
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: wholeDollars ? 0 : 2,
    maximumFractionDigits: wholeDollars ? 0 : 2,
  }).format(cents / 100)
}

/** Integer cents → "149.00" decimal string, for APIs that want dollars (PayPal). */
export function centsToDollarString(cents: number): string {
  return (cents / 100).toFixed(2)
}
