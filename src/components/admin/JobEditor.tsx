'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { TIME_WINDOWS } from '@/lib/booking/timeWindows'
import type { ShelterSize, TimeWindow } from '@/types/database'

export type JobEditorInitial = {
  date: string
  window: TimeWindow
  shelterSize: ShelterSize
  services: string[]
  total: number
  serviceValue: number
  address: string
  notes: string
  isQuote: boolean
  depositPaid: number
}

const input = 'mt-1 h-9 w-full rounded-md border border-white/10 bg-[#0F0F11] px-2.5 text-sm text-[#F0F0F0] outline-none focus-visible:border-sky focus-visible:ring-2 focus-visible:ring-sky/40'
const label = 'block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8A8A8F]'
const dollars = (cents: number): string => (cents / 100).toFixed(2).replace(/\.00$/, '')
const toCents = (v: string): number => Math.round(Number(v || 0) * 100)

/** Edit an upcoming visit (or price an X-Large quote). Prices are entered in dollars. */
export function JobEditor({ jobId, initial }: { jobId: string; initial: JobEditorInitial }): React.ReactElement {
  const router = useRouter()
  const [open, setOpen] = useState(initial.isQuote)
  const [v, setV] = useState({
    date: initial.date,
    window: initial.window,
    shelterSize: initial.shelterSize,
    services: initial.services.join('\n'),
    total: dollars(initial.total),
    serviceValue: dollars(initial.serviceValue),
    address: initial.address,
    notes: initial.notes,
  })
  const [valueTouched, setValueTouched] = useState(false)
  const [notify, setNotify] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function save(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    const services = v.services.split('\n').map((s) => s.trim()).filter(Boolean)
    try {
      const res = await fetch(`/api/jobs/${jobId}/edit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(v.date ? { date: v.date, window: v.window } : {}),
          shelterSize: v.shelterSize,
          serviceTypes: services,
          totalAmount: toCents(v.total),
          serviceValue: valueTouched ? toCents(v.serviceValue) : undefined,
          address: v.address,
          notes: v.notes,
          notify,
        }),
      })
      const json = (await res.json()) as { error?: string; data?: { changed: boolean } }
      if (!res.ok) {
        setMsg({ ok: false, text: json.error ?? 'Could not save' })
        return
      }
      setMsg({ ok: true, text: json.data?.changed ? 'Saved.' : 'No changes.' })
      router.refresh()
    } catch {
      setMsg({ ok: false, text: 'Could not reach the server' })
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="h-9 w-full rounded-md bg-white/[0.06] text-[13px] font-semibold text-[#F0F0F0] hover:bg-white/[0.1]">
        Edit visit — time, services, price
      </button>
    )
  }

  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setV((x) => ({ ...x, [k]: e.target.value }))
  return (
    <form onSubmit={(e) => void save(e)} className="space-y-3">
      {initial.isQuote ? (
        <p className="rounded-md bg-wheat/10 p-2 text-xs text-wheat-light">X-Large quote — set the price, then confirm the visit to put it on the job board.</p>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <label className={label}>Date<input type="date" className={input} value={v.date} onChange={set('date')} /></label>
        <label className={label}>
          Window
          <select className={input} value={v.window} onChange={set('window')}>
            {TIME_WINDOWS.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}
          </select>
        </label>
      </div>
      <label className={label}>
        Shelter size
        <select className={input} value={v.shelterSize} onChange={set('shelterSize')}>
          <option value="small">Small</option>
          <option value="standard">Standard</option>
          <option value="large">Large</option>
          <option value="xlarge">X-Large</option>
        </select>
      </label>
      <label className={label}>
        Services (one per line)
        <textarea className={`${input} h-24 py-2`} value={v.services} onChange={set('services')} />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className={label}>
          Visit total ($)
          <input
            type="number"
            min={0}
            step="0.01"
            className={input}
            value={v.total}
            onChange={(e) => {
              setV((x) => ({ ...x, total: e.target.value, serviceValue: valueTouched ? x.serviceValue : e.target.value }))
            }}
          />
        </label>
        <label className={label}>
          Sweeper pay based on ($)
          <input type="number" min={0} step="0.01" className={input} value={v.serviceValue} onChange={(e) => { setValueTouched(true); set('serviceValue')(e) }} />
        </label>
      </div>
      {initial.depositPaid > 0 ? <p className="text-[11px] text-[#9A9A9F]">A ${dollars(initial.depositPaid)} deposit is already paid; the rest is the balance.</p> : null}
      <label className={label}>Address<input className={input} value={v.address} onChange={set('address')} /></label>
      <label className={label}>Notes for the Sweeper<textarea className={`${input} h-16 py-2`} value={v.notes} onChange={set('notes')} /></label>
      <label className="flex items-center gap-2 text-sm text-[#F0F0F0]">
        <input type="checkbox" className="size-4 accent-sky" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
        Tell the customer (and Sweeper) about time or price changes
      </label>
      <div className="flex items-center gap-2">
        <button type="submit" disabled={busy} className="h-9 rounded-md bg-sky px-4 text-sm font-semibold text-white hover:bg-sky-light disabled:opacity-60">
          {busy ? 'Saving…' : 'Save changes'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="h-9 rounded-md px-3 text-sm text-[#9A9A9F] hover:bg-white/[0.06]">Close</button>
        {msg ? <p role={msg.ok ? 'status' : 'alert'} className={msg.ok ? 'text-xs text-[#2ECC71]' : 'text-xs text-[#F1948A]'}>{msg.text}</p> : null}
      </div>
    </form>
  )
}
