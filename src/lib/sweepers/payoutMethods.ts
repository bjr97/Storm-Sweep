import type { PayoutMethod } from '@/types/database'

/** How a Sweeper was paid (client-safe list for forms). */
export const PAYOUT_METHODS: readonly { value: PayoutMethod; label: string }[] = [
  { value: 'zelle', label: 'Zelle' },
  { value: 'venmo', label: 'Venmo' },
  { value: 'cash_app', label: 'Cash App' },
  { value: 'check', label: 'Check' },
  { value: 'bank', label: 'Bank transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'other', label: 'Other' },
]
