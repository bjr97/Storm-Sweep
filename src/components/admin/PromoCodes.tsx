'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { cn, formatCurrency } from '@/lib/utils'
import type { PromoKind } from '@/types/database'

export type PromoListItem = {
  id: string
  code: string
  label: string
  uses: number
  maxUses: number | null
  discountGiven: number
  firstTimeOnly: boolean
  expiresOn: string | null
  expired: boolean
  active: boolean
  note: string | null
}

const field = 'h-8 rounded-md border border-white/10 bg-[#0F0F11] px-2 text-xs text-[#F0F0F0]'

/** Create + manage promo codes (Marketing page). */
export function PromoCodes({ promos }: { promos: PromoListItem[] }): React.ReactElement {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [kind, setKind] = useState<PromoKind>('amount')
  const [value, setValue] = useState('')
  const [maxUses, setMaxUses] = useState('')
  const [expiresOn, setExpiresOn] = useState('')
  const [firstTimeOnly, setFirstTimeOnly] = useState(false)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function create(): Promise<void> {
    const n = Number(value)
    if (!code.trim() || !Number.isFinite(n) || n <= 0) {
      setError('Enter a code and how much it takes off')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/promos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          kind,
          value: kind === 'amount' ? Math.round(n * 100) : Math.round(n),
          maxUses: maxUses ? Math.round(Number(maxUses)) : null,
          firstTimeOnly,
          expiresOn: expiresOn || null,
          note: note.trim() || null,
        }),
      })
      if (!res.ok) {
        setError(((await res.json()) as { error?: string }).error ?? 'Could not create the code')
        return
      }
      setCode('')
      setValue('')
      setMaxUses('')
      setExpiresOn('')
      setFirstTimeOnly(false)
      setNote('')
      router.refresh()
    } catch {
      setError('Could not reach the server')
    } finally {
      setBusy(false)
    }
  }

  async function toggle(id: string, active: boolean): Promise<void> {
    await fetch(`/api/admin/promos/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active }) })
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-lg border border-white/[0.07] bg-[#141416] p-3">
        <p className="text-xs font-bold text-[#F0F0F0]">New code</p>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-[11px] text-[#9A9A9F]">
            Code
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="STORM20" maxLength={24} className={cn(field, 'mt-1 block w-28 uppercase')} />
          </label>
          <label className="text-[11px] text-[#9A9A9F]">
            Type
            <select value={kind} onChange={(e) => setKind(e.target.value as PromoKind)} className={cn(field, 'mt-1 block')}>
              <option value="amount">$ off</option>
              <option value="percent">% off</option>
            </select>
          </label>
          <label className="text-[11px] text-[#9A9A9F]">
            {kind === 'amount' ? 'Dollars off' : 'Percent off'}
            <input value={value} onChange={(e) => setValue(e.target.value)} inputMode="decimal" placeholder={kind === 'amount' ? '20' : '10'} className={cn(field, 'mt-1 block w-20')} />
          </label>
          <label className="text-[11px] text-[#9A9A9F]">
            Use limit
            <input value={maxUses} onChange={(e) => setMaxUses(e.target.value)} inputMode="numeric" placeholder="None" className={cn(field, 'mt-1 block w-20')} />
          </label>
          <label className="text-[11px] text-[#9A9A9F]">
            Expires after
            <input type="date" value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} className={cn(field, 'mt-1 block')} />
          </label>
          <label className="text-[11px] text-[#9A9A9F]">
            Note (optional)
            <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="Facebook launch post" className={cn(field, 'mt-1 block w-44')} />
          </label>
          <label className="flex h-8 items-center gap-1.5 text-xs text-[#F0F0F0]">
            <input type="checkbox" checked={firstTimeOnly} onChange={(e) => setFirstTimeOnly(e.target.checked)} className="size-3.5 accent-sky" />
            First-time customers only
          </label>
          <button type="button" disabled={busy} onClick={() => void create()} className="h-8 rounded-md bg-sky px-3 text-xs font-bold text-white hover:bg-sky-light disabled:opacity-60">
            {busy ? 'Creating…' : 'Create code'}
          </button>
        </div>
        {error ? <p role="alert" className="text-[11px] text-[#F1948A]">{error}</p> : null}
        <p className="text-[11px] text-[#8A8A8F]">
          One discount per booking (doesn&apos;t combine with friend invites). Every booking still pays at least $1. Cancelled visits give the use back.
        </p>
      </div>

      {promos.length === 0 ? (
        <p className="py-4 text-center text-[13px] italic text-[#8A8A8F]">No promo codes yet.</p>
      ) : (
        <ul className="divide-y divide-white/[0.07]">
          {promos.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-[13px]">
              <span className={cn('font-mono font-bold', p.active && !p.expired ? 'text-white' : 'text-[#6B6B70] line-through')}>{p.code}</span>
              <span className="text-[#F0F0F0]">{p.label}</span>
              <span className="text-[#9A9A9F]">
                {p.uses}
                {p.maxUses ? `/${p.maxUses}` : ''} used · {formatCurrency(p.discountGiven)} given
                {p.firstTimeOnly ? ' · first-time only' : ''}
                {p.expiresOn ? ` · ${p.expired ? 'expired' : 'until'} ${p.expiresOn}` : ''}
              </span>
              {p.note ? <span className="text-[11px] text-[#8A8A8F]">{p.note}</span> : null}
              <button
                type="button"
                onClick={() => void toggle(p.id, !p.active)}
                className="ml-auto rounded-md border border-white/10 px-2 py-1 text-[11px] font-semibold text-[#C9C9CE] hover:bg-white/[0.06]"
              >
                {p.active ? 'Turn off' : 'Turn on'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
