'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { BALANCE_METHODS } from '@/lib/admin/balance'
import { formatCurrency } from '@/lib/utils'
import type { BalanceMethod } from '@/types/database'

/** Record the remaining balance as collected (cash, check, Zelle…). */
export function BalanceButton({ jobId, due }: { jobId: string; due: number }): React.ReactElement {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [method, setMethod] = useState<BalanceMethod>('cash')
  const [reference, setReference] = useState('')
  const [notify, setNotify] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save(): Promise<void> {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/jobs/${jobId}/balance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method, reference: reference.trim() || null, notify }),
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
      <button type="button" onClick={() => setOpen(true)} className="mt-3 h-9 w-full rounded-md bg-wheat text-[13px] font-bold text-shelter hover:bg-wheat-light">
        Mark balance paid · {formatCurrency(due)}
      </button>
    )
  }
  return (
    <div className="mt-3 space-y-2 rounded-md border border-wheat/40 bg-wheat/[0.06] p-2.5">
      <div className="flex flex-wrap gap-2">
        <label className="sr-only" htmlFor={`bm-${jobId}`}>How they paid</label>
        <select id={`bm-${jobId}`} value={method} onChange={(e) => setMethod(e.target.value as BalanceMethod)} className="h-8 rounded-md border border-white/10 bg-[#0F0F11] px-2 text-xs text-[#F0F0F0]">
          {BALANCE_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <label className="sr-only" htmlFor={`br-${jobId}`}>Reference</label>
        <input id={`br-${jobId}`} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Check # (optional)" className="h-8 min-w-0 flex-1 rounded-md border border-white/10 bg-[#0F0F11] px-2 text-xs text-[#F0F0F0]" />
      </div>
      <label className="flex items-center gap-2 text-xs text-[#F0F0F0]">
        <input type="checkbox" className="size-3.5 accent-sky" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
        Send the customer a receipt
      </label>
      <div className="flex gap-2">
        <button type="button" disabled={busy} onClick={() => void save()} className="h-8 rounded-md bg-wheat px-3 text-xs font-bold text-shelter disabled:opacity-60">
          {busy ? 'Saving…' : `Collected ${formatCurrency(due)}`}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="h-8 rounded-md px-2 text-xs text-[#9A9A9F] hover:bg-white/[0.06]">Cancel</button>
      </div>
      {error ? <p role="alert" className="text-[11px] text-[#F1948A]">{error}</p> : null}
    </div>
  )
}
