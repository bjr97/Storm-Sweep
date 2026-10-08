'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { cn } from '@/lib/utils'

type Props = {
  sweeperId: string
  w9: boolean
  agreementSigned: boolean
  insuranceExpiresOn: string | null
  insurance: 'expired' | 'soon' | 'ok' | 'missing'
  notes: string | null
}

const chip = 'rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider'
const good = 'bg-[#27AE60]/15 text-[#2ECC71]'
const bad = 'bg-tornado/15 text-[#F1948A]'
const warn = 'bg-wheat/15 text-wheat-light'

/** W-9 / agreement / insurance status with an inline editor. */
export function SweeperPaperwork(p: Props): React.ReactElement {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [w9, setW9] = useState(p.w9)
  const [exp, setExp] = useState(p.insuranceExpiresOn ?? '')
  const [notes, setNotes] = useState(p.notes ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save(): Promise<void> {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/sweepers/${p.sweeperId}/paperwork`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ w9Received: w9, insuranceExpiresOn: exp || null, notes: notes.trim() || null }),
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

  const insuranceLabel = { expired: 'Insurance expired', soon: 'Insurance expiring', ok: 'Insured', missing: 'No insurance date' }[p.insurance]
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1">
        <span className={cn(chip, p.w9 ? good : bad)}>{p.w9 ? 'W-9' : 'No W-9'}</span>
        <span className={cn(chip, p.agreementSigned ? good : bad)}>{p.agreementSigned ? 'Agreement' : 'No agreement'}</span>
        <span className={cn(chip, p.insurance === 'ok' ? good : p.insurance === 'soon' ? warn : bad)} title={p.insuranceExpiresOn ? `Expires ${p.insuranceExpiresOn}` : undefined}>
          {insuranceLabel}
        </span>
        {!open ? (
          <button type="button" onClick={() => setOpen(true)} className="text-[11px] font-semibold text-sky-light hover:underline">
            Edit
          </button>
        ) : null}
      </div>
      {open ? (
        <div className="space-y-2 rounded-md border border-white/10 bg-[#141416] p-2">
          <label className="flex items-center gap-2 text-xs text-[#F0F0F0]">
            <input type="checkbox" className="size-3.5 accent-sky" checked={w9} onChange={(e) => setW9(e.target.checked)} />
            W-9 received (keep the form itself outside the app)
          </label>
          <label className="block text-[11px] text-[#9A9A9F]">
            Auto insurance expires
            <input type="date" value={exp} onChange={(e) => setExp(e.target.value)} className="mt-1 h-8 w-full rounded-md border border-white/10 bg-[#0F0F11] px-2 text-xs text-[#F0F0F0]" />
          </label>
          <label className="block text-[11px] text-[#9A9A9F]">
            Notes
            <input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} className="mt-1 h-8 w-full rounded-md border border-white/10 bg-[#0F0F11] px-2 text-xs text-[#F0F0F0]" />
          </label>
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={() => void save()} className="h-7 rounded-md bg-sky px-2.5 text-[11px] font-bold text-white disabled:opacity-60">
              {busy ? 'Saving…' : 'Save'}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="h-7 rounded-md px-2 text-[11px] text-[#9A9A9F]">Cancel</button>
          </div>
          {error ? <p role="alert" className="text-[11px] text-[#F1948A]">{error}</p> : null}
        </div>
      ) : null}
      {p.notes && !open ? <p className="text-[11px] text-[#8A8A8F]">{p.notes}</p> : null}
    </div>
  )
}
