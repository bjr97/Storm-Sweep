'use client'

import { addDays, format } from 'date-fns'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

import { HARDWARE_ADDONS, type HardwareAddonId } from '@/lib/booking/addons'
import { parseServiceAddress } from '@/lib/booking/address'
import { priceBooking } from '@/lib/booking/quote'
import { REFERRAL_SOURCES, SHELTER_SIZE_OPTIONS, splitFullName } from '@/lib/booking/schemas'
import { TIME_WINDOWS } from '@/lib/booking/timeWindows'
import { cn, formatCurrency } from '@/lib/utils'
import type { ShelterSize, TimeWindow } from '@/types/database'

const input = 'mt-1 h-9 w-full rounded-md border border-white/10 bg-[#0F0F11] px-2.5 text-sm text-[#F0F0F0] outline-none focus-visible:border-sky focus-visible:ring-2 focus-visible:ring-sky/40'
const label = 'block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8A8A8F]'

type Lookup = { fullName: string | null; phone: string | null; address: string | null; member: { visitsUsed: number } | null } | null

/** Office phone booking. The preview mirrors the server; the server re-prices on save. */
export function PhoneBookingForm(): React.ReactElement {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [lookup, setLookup] = useState<Lookup | 'none' | 'checking'>(null)
  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [phone, setPhone] = useState('')
  const [street, setStreet] = useState('')
  const [city, setCity] = useState('Norman')
  const [state, setState] = useState('OK')
  const [zip, setZip] = useState('')
  const [date, setDate] = useState('')
  const [window, setWindow] = useState<TimeWindow>('morning')
  const [size, setSize] = useState<ShelterSize>('standard')
  const [led, setLed] = useState(false)
  const [full, setFull] = useState(false)
  const [addons, setAddons] = useState<HardwareAddonId[]>([])
  const [useIncluded, setUseIncluded] = useState(false)
  const [payment, setPayment] = useState<'unpaid' | 'deposit_paid' | 'paid'>('unpaid')
  const [source, setSource] = useState('')
  const [notes, setNotes] = useState('')
  const [notify, setNotify] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const member = lookup && typeof lookup === 'object' ? lookup.member : null
  const quote = useMemo(
    () =>
      priceBooking(
        { shelter_size: size, deep_clean: true, led_package: led || full, full_package: full, hardware_addons: addons, membership: useIncluded && member ? 'member' : 'one_time' },
        null,
        useIncluded ? member : null
      ),
    [size, led, full, addons, useIncluded, member]
  )

  async function findCustomer(): Promise<void> {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return
    setLookup('checking')
    try {
      const res = await fetch(`/api/admin/customers/lookup?email=${encodeURIComponent(email.trim())}`)
      const json = (await res.json()) as { data?: Lookup }
      const found = json.data ?? null
      setLookup(found ?? 'none')
      if (found) {
        const n = splitFullName(found.fullName ?? '')
        setFirst((v) => v || n.first_name)
        setLast((v) => v || n.last_name)
        setPhone((v) => v || found.phone || '')
        const a = parseServiceAddress(found.address)
        if (a.address && !street) {
          setStreet(a.address)
          if (a.city) setCity(a.city)
          if (a.zip) setZip(a.zip)
        }
        setUseIncluded(Boolean(found.member && found.member.visitsUsed < 2))
      }
    } catch {
      setLookup(null)
    }
  }

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: first, lastName: last, email, phone,
          address: street, city, state, zip,
          date, window,
          service: { shelter_size: size, deep_clean: true, led_package: led || full, full_package: full, hardware_addons: addons },
          useIncludedVisit: useIncluded && Boolean(member),
          payment, referralSource: source || undefined, notes: notes || undefined, notifyCustomer: notify,
        }),
      })
      const json = (await res.json()) as { error?: string; data?: { id: string } }
      if (!res.ok || !json.data) {
        setError(json.error ?? 'Could not create the booking')
        return
      }
      router.push(`/admin/jobs/${json.data.id}`)
    } catch {
      setError('Could not reach the server')
    } finally {
      setBusy(false)
    }
  }

  const total = quote.breakdown.total
  return (
    <form onSubmit={(e) => void submit(e)} className="grid gap-4 xl:grid-cols-3">
      <div className="space-y-4 xl:col-span-2">
        <fieldset className="grid gap-3 rounded-xl border border-white/[0.07] bg-[#1C1C1F] p-4 sm:grid-cols-2">
          <legend className="px-1 text-sm font-semibold text-[#F0F0F0]">Customer</legend>
          <label className={`${label} sm:col-span-2`}>
            Email
            <input className={input} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => void findCustomer()} />
            <span className="mt-1 block normal-case tracking-normal text-[#9A9A9F]">
              {lookup === 'checking' ? 'Looking up…' : lookup === 'none' ? 'New customer — an account is created for them.' : lookup && typeof lookup === 'object' ? `Existing customer${lookup.member ? ` · Storm Ready member (${lookup.member.visitsUsed}/2 visits used)` : ''}` : 'Existing customers are filled in automatically.'}
            </span>
          </label>
          <label className={label}>First name<input className={input} required value={first} onChange={(e) => setFirst(e.target.value)} /></label>
          <label className={label}>Last name<input className={input} required value={last} onChange={(e) => setLast(e.target.value)} /></label>
          <label className={`${label} sm:col-span-2`}>Mobile phone<input className={input} type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
        </fieldset>

        <fieldset className="grid gap-3 rounded-xl border border-white/[0.07] bg-[#1C1C1F] p-4 sm:grid-cols-[1fr_90px_120px]">
          <legend className="px-1 text-sm font-semibold text-[#F0F0F0]">Service address</legend>
          <label className={`${label} sm:col-span-3`}>Street<input className={input} required value={street} onChange={(e) => setStreet(e.target.value)} /></label>
          <label className={label}>City<input className={input} required value={city} onChange={(e) => setCity(e.target.value)} /></label>
          <label className={label}>State<input className={`${input} uppercase`} required maxLength={2} value={state} onChange={(e) => setState(e.target.value)} /></label>
          <label className={label}>ZIP<input className={input} required inputMode="numeric" value={zip} onChange={(e) => setZip(e.target.value)} /></label>
        </fieldset>

        <fieldset className="grid gap-3 rounded-xl border border-white/[0.07] bg-[#1C1C1F] p-4 sm:grid-cols-2">
          <legend className="px-1 text-sm font-semibold text-[#F0F0F0]">When</legend>
          <label className={label}>Date<input className={input} type="date" required min={format(addDays(new Date(), 1), 'yyyy-MM-dd')} value={date} onChange={(e) => setDate(e.target.value)} /></label>
          <label className={label}>
            Arrival window
            <select className={input} value={window} onChange={(e) => setWindow(e.target.value as TimeWindow)}>
              {TIME_WINDOWS.map((w) => <option key={w.value} value={w.value}>{w.label} · {w.hours}</option>)}
            </select>
          </label>
        </fieldset>

        <fieldset className="space-y-3 rounded-xl border border-white/[0.07] bg-[#1C1C1F] p-4">
          <legend className="px-1 text-sm font-semibold text-[#F0F0F0]">Services</legend>
          <label className={label}>
            Shelter size
            <select className={input} value={size} onChange={(e) => setSize(e.target.value as ShelterSize)}>
              {SHELTER_SIZE_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label} — {s.description}</option>)}
            </select>
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { key: 'full', label: 'Full Package (clean + LED + Storm Starter kit)', on: full, set: setFull },
              { key: 'led', label: 'LED Package', on: led || full, set: setLed, disabled: full },
            ].map((o) => (
              <label key={o.key} className="flex items-center gap-2 text-sm text-[#F0F0F0]">
                <input type="checkbox" className="size-4 accent-sky" checked={o.on} disabled={o.disabled} onChange={(e) => o.set(e.target.checked)} />
                {o.label}
              </label>
            ))}
            {HARDWARE_ADDONS.map((a) => (
              <label key={a.id} className="flex items-center gap-2 text-sm text-[#F0F0F0]">
                <input
                  type="checkbox"
                  className="size-4 accent-sky"
                  checked={addons.includes(a.id)}
                  onChange={(e) => setAddons((list) => (e.target.checked ? [...list, a.id] : list.filter((x) => x !== a.id)))}
                />
                {a.name}
              </label>
            ))}
          </div>
          {member ? (
            <label className="flex items-center gap-2 rounded-md bg-wheat/10 p-2 text-sm text-wheat-light">
              <input type="checkbox" className="size-4 accent-sky" checked={useIncluded} onChange={(e) => setUseIncluded(e.target.checked)} />
              Use their included Storm Ready visit ({member.visitsUsed}/2 used) — members always get 10% off upgrades
            </label>
          ) : null}
        </fieldset>
      </div>

      <div className="space-y-4">
        <section className="space-y-2 rounded-xl border border-white/[0.07] bg-[#1C1C1F] p-4">
          <h2 className="text-sm font-semibold text-[#F0F0F0]">Price</h2>
          <ul className="space-y-1 text-[13px]">
            {quote.breakdown.lineItems.map((l) => (
              <li key={l.label} className="flex justify-between gap-2 text-[#C9C9CE]">
                <span>{l.label}</span>
                <span>{l.amount === null ? 'Quote' : formatCurrency(l.amount)}</span>
              </li>
            ))}
          </ul>
          <p className="flex justify-between border-t border-white/10 pt-2 text-sm font-bold text-white">
            <span>Total</span>
            <span>{total === null ? 'Quote — stays pending' : formatCurrency(total)}</span>
          </p>
        </section>

        <section className="space-y-3 rounded-xl border border-white/[0.07] bg-[#1C1C1F] p-4">
          <fieldset className="space-y-1.5">
            <legend className="text-sm font-semibold text-[#F0F0F0]">Payment</legend>
            {[
              { v: 'unpaid' as const, l: 'Collect later' },
              { v: 'deposit_paid' as const, l: 'Took the deposit' },
              { v: 'paid' as const, l: 'Paid in full' },
            ].map((p) => (
              <label key={p.v} className={cn('flex items-center gap-2 text-sm', payment === p.v ? 'text-white' : 'text-[#C9C9CE]')}>
                <input type="radio" name="payment" className="accent-sky" checked={payment === p.v} onChange={() => setPayment(p.v)} />
                {p.l}
              </label>
            ))}
          </fieldset>
          <label className={label}>
            How they heard about us
            <select className={input} value={source} onChange={(e) => setSource(e.target.value)}>
              <option value="">Phone call</option>
              {REFERRAL_SOURCES.filter((s) => s.value !== 'partner').map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </label>
          <label className={label}>
            Notes for the Sweeper
            <textarea className={`${input} h-20 py-2`} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Gate code, dog in yard, etc." />
          </label>
          <label className="flex items-center gap-2 text-sm text-[#F0F0F0]">
            <input type="checkbox" className="size-4 accent-sky" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
            Send them a confirmation text + email
          </label>
          {error ? <p role="alert" className="text-sm text-[#F1948A]">{error}</p> : null}
          <button type="submit" disabled={busy} className="h-10 w-full rounded-md bg-sky font-semibold text-white hover:bg-sky-light disabled:opacity-60">
            {busy ? 'Booking…' : 'Create booking'}
          </button>
          <p className="text-[11px] text-[#8A8A8F]">The visit is confirmed right away and goes on the Sweeper job board.</p>
        </section>
      </div>
    </form>
  )
}
