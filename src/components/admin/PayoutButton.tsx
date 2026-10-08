'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { PAYOUT_METHODS } from '@/lib/sweepers/payoutMethods'
import { formatCurrency } from '@/lib/utils'
import type { PayoutMethod } from '@/types/database'

/** Record that you paid a Sweeper (outside the app) for everything they're owed. */
export function PayoutButton({ sweeperId, name, owed, jobs }: { sweeperId: string; name: string; owed: number; jobs: number }): React.ReactElement {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [method, setMethod] = useState<PayoutMethod>('zelle')
  const [reference, setReference] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (owed <= 0) return <span className="text-xs text-[#8A8A8F]">Nothing owed</span>

  async function save(): Promise<void> {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sweeperId, method, reference: reference.trim() || null }),
      })
      if (!res.ok) {
        setError(((await res.json()) as { error?: string }).error ?? 'Could not save')
        return
      }
      setOpen(false)
      router.refresh()
    } catch {
      setError('Could not reach the server')
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="h-8 rounded-md bg-wheat px-3 text-xs font-bold text-shelter hover:bg-wheat-light">
        Record payout · {formatCurrency(owed)}
      </button>
    )
  }
  return (
    <div className="space-y-2 rounded-md border border-wheat/40 bg-wheat/[0.06] p-2.5">
      <p className="text-xs text-[#F0F0F0]">
        Paid {name} <b>{formatCurrency(owed)}</b> for {jobs} job{jobs === 1 ? '' : 's'}?
      </p>
      <div className="flex flex-wrap gap-2">
        <label className="sr-only" htmlFor={`m-${sweeperId}`}>Method</label>
        <select id={`m-${sweeperId}`} value={method} onChange={(e) => setMethod(e.target.value as PayoutMethod)} className="h-8 rounded-md border border-white/10 bg-[#0F0F11] px-2 text-xs text-[#F0F0F0]">
          {PAYOUT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <label className="sr-only" htmlFor={`r-${sweeperId}`}>Reference</label>
        <input id={`r-${sweeperId}`} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Check # / confirmation (optional)" className="h-8 min-w-0 flex-1 rounded-md border border-white/10 bg-[#0F0F11] px-2 text-xs text-[#F0F0F0]" />
      </div>
      <div className="flex gap-2">
        <button type="button" disabled={busy} onClick={() => void save()} className="h-8 rounded-md bg-wheat px-3 text-xs font-bold text-shelter disabled:opacity-60">
          {busy ? 'Saving…' : 'Yes, record it'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="h-8 rounded-md px-2 text-xs text-[#9A9A9F] hover:bg-white/[0.06]">Cancel</button>
      </div>
      {error ? <p role="alert" className="text-[11px] text-[#F1948A]">{error}</p> : null}
    </div>
  )
}
