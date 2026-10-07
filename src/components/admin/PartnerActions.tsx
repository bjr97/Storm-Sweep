'use client'

import { Check, Copy, Pencil } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { PartnerForm } from '@/components/admin/PartnerForm'
import type { PartnerInput } from '@/lib/admin/partnerRules'
import { formatCurrency } from '@/lib/utils'

export function CopyLinkButton({ url }: { url: string }): React.ReactElement {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(url).then(() => {
          setCopied(true)
          window.setTimeout(() => setCopied(false), 2000)
        })
      }}
      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold text-sky-light hover:bg-white/[0.06]"
      aria-label={`Copy referral link ${url}`}
    >
      {copied ? <Check className="size-3" aria-hidden="true" /> : <Copy className="size-3" aria-hidden="true" />}
      {copied ? 'Copied' : 'Copy link'}
    </button>
  )
}

export function PartnerRowActions({
  partnerId,
  owed,
  initial,
}: {
  partnerId: string
  owed: number
  initial: PartnerInput
}): React.ReactElement {
  const router = useRouter()
  const [mode, setMode] = useState<'idle' | 'edit' | 'pay'>('idle')
  const [amount, setAmount] = useState(String(owed / 100))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function recordPayout(): Promise<void> {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/partners/${partnerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'payout', amount: Math.round(Number(amount) * 100) }),
      })
      if (!res.ok) {
        setError(((await res.json()) as { error?: string }).error ?? 'Could not save')
        return
      }
      setMode('idle')
      router.refresh()
    } catch {
      setError('Could not reach the server')
    } finally {
      setBusy(false)
    }
  }

  if (mode === 'edit') {
    return (
      <div className="rounded-lg border border-white/[0.1] bg-[#141416] p-3">
        <PartnerForm partnerId={partnerId} initial={initial} onDone={() => setMode('idle')} />
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={() => setMode('edit')} className="inline-flex h-8 items-center gap-1 rounded-md px-2.5 text-xs font-semibold text-[#C9C9CE] hover:bg-white/[0.06]">
        <Pencil className="size-3.5" aria-hidden="true" /> Edit
      </button>
      {mode === 'pay' ? (
        <span className="inline-flex items-center gap-1.5">
          <label className="sr-only" htmlFor={`pay-${partnerId}`}>Amount paid ($)</label>
          <span className="text-xs text-[#9A9A9F]">$</span>
          <input
            id={`pay-${partnerId}`}
            type="number"
            min={0}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-8 w-20 rounded-md border border-white/10 bg-[#0F0F11] px-2 text-xs text-[#F0F0F0]"
          />
          <button type="button" disabled={busy || !(Number(amount) > 0)} onClick={() => void recordPayout()} className="h-8 rounded-md bg-wheat px-2.5 text-xs font-bold text-shelter disabled:opacity-50">
            {busy ? 'Saving…' : 'Record'}
          </button>
          <button type="button" onClick={() => setMode('idle')} className="h-8 rounded-md px-2 text-xs text-[#9A9A9F] hover:bg-white/[0.06]">Cancel</button>
        </span>
      ) : owed > 0 ? (
        <button type="button" onClick={() => setMode('pay')} className="h-8 rounded-md bg-wheat/15 px-2.5 text-xs font-bold text-wheat-light hover:bg-wheat/25">
          Record payout ({formatCurrency(owed)})
        </button>
      ) : null}
      {error ? <p role="alert" className="w-full text-[11px] text-[#F1948A]">{error}</p> : null}
    </div>
  )
}
