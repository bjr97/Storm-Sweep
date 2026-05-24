import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export const PRICING = {
  shelter: {
    small: 129,
    standard: 149,
    large: 179,
    xlarge: null,
  },
  addons: {
    led_package: 89,
    supply_kit_starter: 29,
    supply_kit_essential: 49,
    supply_kit_family: 79,
    supply_kit_pro: 109,
    supply_kit_elite: 149,
    interior_handle: 45,
    hinge_service: 35,
    lock_replacement: 65,
    extension_cord: 15,
  },
  membership: {
    annual: 249,
    monthly: 24,
  },
  bundles: {
    clean_plus_led: 219,
    clean_plus_kit_basic: 179,
    full_package: 299,
  },
  sweeper: {
    base_pct: 0.6,
    accept_1hr_pct: 0.68,
    accept_4hr_pct: 0.64,
    accept_24hr_pct: 0.62,
    turnaround_same_day: 25,
    turnaround_day_1: 20,
    turnaround_day_2: 10,
    turnaround_day_3: 5,
    upgrade_commission: 15,
    video_bonus: 10,
  },
  referral: {
    customer_credit: 25,
    partner_roofing: 20,
    partner_realtor: 25,
    partner_lawn: 15,
  },
  deposit_pct: 0.5,
} as const

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

export const SUPPLY_KITS = {
  starter: {
    name: 'Starter Kit',
    price: 29,
    items: [
      '1L water (2-pack)',
      'Mini first aid kit',
      'Emergency whistle',
      'LED keychain flashlight',
      'Storm Sweep checklist card',
    ],
  },
  essential: {
    name: 'Essential Kit',
    price: 49,
    items: [
      '2L water (3-pack)',
      'Standard first aid kit',
      'Hand-crank weather radio',
      'Emergency mylar blankets (2)',
      'USB power bank 5000mAh',
      'Universal phone cable',
    ],
  },
  family: {
    name: 'Family Kit',
    price: 79,
    items: [
      'Everything in Essential',
      'Extra water (6-pack total)',
      '3-day food bars (2 person)',
      'Baby/toddler comfort items',
      'Extra mylar blankets (4)',
      'Dust masks (4-pack)',
      'Glow sticks (6-pack)',
    ],
  },
  pro: {
    name: 'Pro Kit',
    price: 109,
    items: [
      'Everything in Family',
      '72-hr water supply (family of 4)',
      'Full first aid with trauma items',
      'Hand-crank + solar radio/flashlight',
      '20,000mAh power bank',
      'Multi-tool',
      'Waterproof document pouch',
      'N95 masks (4-pack)',
    ],
  },
  elite: {
    name: 'Storm Ready Elite',
    price: 149,
    items: [
      'Everything in Pro',
      '7-day water supply',
      '72-hr emergency food (4 person)',
      'Portable toilet kit',
      'Cash envelope ($20 small bills)',
      'Extra medication organizer',
      'Kids activity/comfort pack',
      'Laminated family emergency card',
      'Storm Sweep branded storage bin',
    ],
  },
} as const

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount)
}
