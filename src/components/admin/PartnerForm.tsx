'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import {
  defaultPayout,
  PARTNER_TYPE_LABEL,
  PARTNER_TYPES,
  suggestReferralCode,
  type PartnerInput,
  type PartnerType,
} from '@/lib/admin/partnerRules'

type Initial = Omit<PartnerInput, 'payout_per_referral'> & { payout_per_referral: number }

const field = 'mt-1 h-9 w-full rounded-md border border-white/10 bg-[#0F0F11] px-2.5 text-sm text-[#F0F0F0] outline-none focus-visible:border-sky focus-visible:ring-2 focus-visible:ring-sky/40'
const label = 'block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8A8A8F]'

/** Create (no partnerId) or edit a partner. Payout is entered in dollars, stored in cents. */
export function PartnerForm({
  partnerId,
  initial,
  onDone,
}: {
  partnerId?: string
  initial?: Initial
  onDone?: () => void
}): React.ReactElement {
  const router = useRouter()
  const [v, setV] = useState<Initial>(
    initial ?? {
      name: '',
      type: 'roofing',
      referral_code: '',
      contact_name: null,
      contact_phone: null,
      payout_per_referral: defaultPayout('roofing'),
      notes: null,
      active: true,
    }
  )
  const [codeTouched, setCodeTouched] = useState(Boolean(initial))
  const [payoutTouched, setPayoutTouched] = useState(Boolean(initial))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof Initial>(k: K, value: Initial[K]): void {
    setV((prev) => ({ ...prev, [k]: value }))
  }

  async function save(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const partner = {
      ...v,
      referral_code: v.referral_code || suggestReferralCode(v.name),
      contact_name: v.contact_name?.trim() || null,
      contact_phone: v.contact_phone?.trim() || null,
      notes: v.notes?.trim() || null,
    }
    try {
      const res = await fetch(partnerId ? `/api/admin/partners/${partnerId}` : '/api/admin/partners', {
        method: partnerId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(partnerId ? { action: 'update', partner } : partner),
      })
      if (!res.ok) {
        setError(((await res.json()) as { error?: string }).error ?? 'Could not save')
        return
      }
      router.refresh()
      onDone?.()
      if (!partnerId) {
        setV({ name: '', type: 'roofing', referral_code: '', contact_name: null, contact_phone: null, payout_per_referral: defaultPayout('roofing'), notes: null, active: true })
        setCodeTouched(false)
        setPayoutTouched(false)
      }
    } catch {
      setError('Could not reach the server')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={(e) => void save(e)} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <label className={`${label} sm:col-span-2`}>
        Business name
        <input
          className={field}
          value={v.name}
          onChange={(e) => {
            set('name', e.target.value)
            if (!codeTouched) set('referral_code', e.target.value ? suggestReferralCode(e.target.value).replace(/\d+$/, '') : '')
          }}
          required
        />
      </label>
      <label className={label}>
        Type
        <select
          className={field}
          value={v.type}
          onChange={(e) => {
            const type = e.target.value as PartnerType
            set('type', type)
            if (!payoutTouched) set('payout_per_referral', defaultPayout(type))
          }}
        >
          {PARTNER_TYPES.map((t) => (
            <option key={t} value={t}>{PARTNER_TYPE_LABEL[t]}</option>
          ))}
        </select>
      </label>
      <label className={label}>
        Referral code
        <input
          className={`${field} uppercase`}
          value={v.referral_code}
          onChange={(e) => {
            setCodeTouched(true)
            set('referral_code', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16))
          }}
          placeholder="Auto"
        />
      </label>
      <label className={label}>
        Contact name
        <input className={field} value={v.contact_name ?? ''} onChange={(e) => set('contact_name', e.target.value)} />
      </label>
      <label className={label}>
        Contact phone
        <input className={field} type="tel" value={v.contact_phone ?? ''} onChange={(e) => set('contact_phone', e.target.value)} />
      </label>
      <label className={label}>
        Payout per completed referral ($)
        <input
          className={field}
          type="number"
          min={0}
          step="1"
          value={v.payout_per_referral / 100}
          onChange={(e) => {
            setPayoutTouched(true)
            set('payout_per_referral', Math.round(Number(e.target.value || 0) * 100))
          }}
        />
      </label>
      <label className={`${label} flex items-end gap-2 pb-2`}>
        <input type="checkbox" checked={v.active} onChange={(e) => set('active', e.target.checked)} className="size-4 accent-sky" />
        <span className="normal-case tracking-normal text-[#F0F0F0]">Active (code works at booking)</span>
      </label>
      <label className={`${label} sm:col-span-2 lg:col-span-4`}>
        Notes
        <input className={field} value={v.notes ?? ''} onChange={(e) => set('notes', e.target.value)} placeholder="e.g. pays quarterly by check" />
      </label>
      <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-4">
        <button type="submit" disabled={busy || v.name.trim().length < 2} className="h-9 rounded-md bg-sky px-4 text-sm font-semibold text-white hover:bg-sky-light disabled:opacity-50">
          {busy ? 'Saving…' : partnerId ? 'Save changes' : 'Add partner'}
        </button>
        {onDone ? (
          <button type="button" onClick={onDone} className="h-9 rounded-md px-3 text-sm font-semibold text-[#9A9A9F] hover:bg-white/[0.06]">
            Cancel
          </button>
        ) : null}
        {error ? <p role="alert" className="text-sm text-[#F1948A]">{error}</p> : null}
      </div>
    </form>
  )
}
