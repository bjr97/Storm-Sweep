import type { BalanceMethod, Job } from '@/types/database'

/** Remaining balance on a visit (cents): total minus any deposit already paid. */
export function balanceDue(job: Pick<Job, 'total_amount' | 'deposit_amount' | 'payment_status' | 'status'>): number {
  if (job.status === 'cancelled' || job.payment_status === 'paid' || job.payment_status === 'refunded') return 0
  const deposit = job.payment_status === 'deposit_paid' ? job.deposit_amount ?? 0 : 0
  return Math.max(0, job.total_amount - deposit)
}

export const BALANCE_METHODS: readonly { value: BalanceMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
  { value: 'zelle', label: 'Zelle' },
  { value: 'venmo', label: 'Venmo' },
  { value: 'cash_app', label: 'Cash App' },
  { value: 'card', label: 'Card' },
  { value: 'other', label: 'Other' },
]
