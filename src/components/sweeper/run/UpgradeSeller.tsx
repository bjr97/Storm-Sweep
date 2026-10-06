'use client'

import { Plus, X } from 'lucide-react'
import { useState } from 'react'

import { useRunAction } from '@/components/sweeper/run/useRunAction'
import type { SellableUpgradeId } from '@/lib/sweepers/jobRun'
import { formatCurrency, PRICING } from '@/lib/utils'

export type UpgradeOption = { id: SellableUpgradeId; name: string; listPrice: number; discount: number; price: number }
export type SoldUpgrade = { id: string; name: string; price: number; initials: string }

/**
 * Sweeper picks an upgrade, then hands the phone to the customer, who reviews
 * the price and approves with their initials. Adds to the balance due.
 */
export function UpgradeSeller({
  jobId,
  options,
  sold,
  isMember,
  locked,
}: {
  jobId: string
  options: UpgradeOption[]
  sold: SoldUpgrade[]
  isMember: boolean
  locked: boolean
}): React.ReactElement {
  const { run, busy, error, setError } = useRunAction(jobId)
  const [picked, setPicked] = useState<UpgradeOption | null>(null)
  const [initials, setInitials] = useState('')

  async function approve(): Promise<void> {
    if (!picked) return
    const res = await run({ action: 'sell_upgrade', addonId: picked.id, initials })
    if (res.ok) {
      setPicked(null)
      setInitials('')
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-[#9A9A9F]">
        You earn {formatCurrency(PRICING.sweeper.upgrade_commission)} for each upgrade the customer approves and you install today.
      </p>

      {sold.length > 0 ? (
        <ul className="space-y-1.5">
          {sold.map((u) => (
            <li key={u.id} className="flex items-center justify-between gap-2 rounded-lg bg-[#27AE60]/10 px-3 py-2 text-sm">
              <span className="text-[#F0F0F0]">
                {u.name} · {formatCurrency(u.price)} <span className="text-xs text-[#8A8A8F]">approved ({u.initials})</span>
              </span>
              {!locked ? (
                <button
                  type="button"
                  onClick={() => void run({ action: 'remove_upgrade', upgradeId: u.id })}
                  disabled={busy}
                  aria-label={`Remove ${u.name}`}
                  className="rounded p-1 text-[#9A9A9F] hover:bg-white/10 hover:text-white"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {!picked ? (
        options.length === 0 ? (
          <p className="text-xs text-[#8A8A8F]">Every upgrade is already on this job.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {options.map((o) => (
              <button
                key={o.id}
                type="button"
                disabled={locked}
                onClick={() => {
                  setError(null)
                  setPicked(o)
                }}
                className="flex flex-col items-start rounded-lg border border-white/[0.1] bg-white/[0.03] p-3 text-left hover:border-sky/50 disabled:opacity-50"
              >
                <span className="flex items-center gap-1 text-sm font-semibold text-[#F0F0F0]">
                  <Plus className="size-3.5 text-sky-light" aria-hidden="true" />
                  {o.name}
                </span>
                <span className="text-xs text-[#9A9A9F]">{formatCurrency(o.price)}</span>
              </button>
            ))}
          </div>
        )
      ) : (
        <div className="space-y-3 rounded-xl border-2 border-wheat/50 bg-[#F7F7F4] p-4 text-shelter">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#6B6B70]">Customer approval</p>
          <p className="font-[family-name:var(--font-bebas)] text-2xl tracking-wide">{picked.name}</p>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between"><dt>Price</dt><dd>{formatCurrency(picked.listPrice)}</dd></div>
            {isMember && picked.discount < 0 ? (
              <div className="flex justify-between text-[#1E7D46]"><dt>Storm Ready member discount</dt><dd>{formatCurrency(picked.discount)}</dd></div>
            ) : null}
            <div className="flex justify-between border-t border-black/10 pt-1 font-bold"><dt>Added to your balance</dt><dd>{formatCurrency(picked.price)}</dd></div>
          </dl>
          <label className="block text-sm">
            <span className="font-semibold">Your initials to approve</span>
            <input
              value={initials}
              onChange={(e) => setInitials(e.target.value.replace(/[^a-zA-Z]/g, '').slice(0, 4))}
              autoCapitalize="characters"
              autoComplete="off"
              className="mt-1 h-12 w-full rounded-lg border border-black/20 bg-white px-3 text-lg font-bold uppercase tracking-widest outline-none focus-visible:border-sky focus-visible:ring-2 focus-visible:ring-sky/40"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void approve()}
              disabled={busy || initials.length < 2}
              className="h-12 flex-1 rounded-lg bg-sky font-bold text-white hover:bg-sky-dark disabled:opacity-50"
            >
              {busy ? 'Adding…' : 'I approve'}
            </button>
            <button type="button" onClick={() => setPicked(null)} className="h-12 rounded-lg px-4 font-semibold text-[#6B6B70] hover:bg-black/5">
              Cancel
            </button>
          </div>
        </div>
      )}
      {error ? <p role="alert" className="text-sm font-semibold text-[#F1948A]">{error}</p> : null}
    </div>
  )
}
