'use client'

import { useState } from 'react'

import { Input } from '@/components/ui/input'
import type { PromoRule } from '@/lib/booking/quote'
import { formatCurrency } from '@/lib/utils'

type Props = {
  email: string
  withInvite: boolean
  applied: PromoRule | null
  /** Cents the applied code takes off right now (from the live quote). */
  saved: number
  onChange: (rule: PromoRule | null) => void
}

/** "Have a promo code?" on the Payment step. The server re-checks it at checkout. */
export function PromoCodeField({ email, withInvite, applied, saved, onChange }: Props): React.ReactElement {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function apply(): Promise<void> {
    if (!code.trim()) return
    setBusy(true)
    setError(null)
    try {
      const params = new URLSearchParams({ code, email, invite: withInvite ? '1' : '0' })
      const res = await fetch(`/api/promo/validate?${params.toString()}`)
      const json = (await res.json()) as { data?: { valid: boolean; reason?: string; code?: string; kind?: PromoRule['kind']; value?: number } }
      const d = json.data
      if (d?.valid && d.code && d.kind && d.value) {
        onChange({ code: d.code, kind: d.kind, value: d.value })
        setCode('')
      } else {
        setError(d?.reason ?? 'That promo code isn’t valid')
      }
    } catch {
      setError('Couldn’t check that code — try again')
    } finally {
      setBusy(false)
    }
  }

  if (applied) {
    return (
      <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#27AE60]/10 px-4 py-3 text-sm text-[#1E7D46]">
        <span>
          Promo <b>{applied.code}</b> applied{saved > 0 ? ` — you save ${formatCurrency(saved)}` : ''}.
        </span>
        <button type="button" onClick={() => onChange(null)} className="text-xs font-semibold underline underline-offset-2">
          Remove
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <label htmlFor="promo-code" className="text-sm font-semibold text-shelter">
        Promo code
      </label>
      <div className="flex gap-2">
        <Input
          id="promo-code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              void apply()
            }
          }}
          placeholder="Enter code"
          autoComplete="off"
          maxLength={24}
          className="max-w-[220px] uppercase"
        />
        <button
          type="button"
          onClick={() => void apply()}
          disabled={busy || !code.trim()}
          className="h-10 rounded-md border border-shelter/20 px-4 text-sm font-semibold text-shelter hover:bg-black/5 disabled:opacity-50"
        >
          {busy ? 'Checking…' : 'Apply'}
        </button>
      </div>
      {error ? (
        <p role="alert" className="text-xs text-tornado">
          {error}
        </p>
      ) : null}
    </div>
  )
}
