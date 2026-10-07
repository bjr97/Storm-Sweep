'use client'

import { addDays, format } from 'date-fns'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { TIME_WINDOWS } from '@/lib/booking/timeWindows'
import { CHANGE_CUTOFF_HOURS } from '@/lib/customer/rules'
import { cn } from '@/lib/utils'
import type { TimeWindow } from '@/types/database'

/** Reschedule / cancel an upcoming visit (until 48 hours before). No browser dialogs. */
export function VisitChanger({
  jobId,
  canChange,
  hasDeposit,
  isMemberVisit,
}: {
  jobId: string
  canChange: boolean
  hasDeposit: boolean
  isMemberVisit: boolean
}): React.ReactElement {
  const router = useRouter()
  const [mode, setMode] = useState<'idle' | 'reschedule' | 'cancel'>('idle')
  const [date, setDate] = useState('')
  const [window, setWindow] = useState<TimeWindow | ''>('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  if (!canChange) {
    return (
      <p className="text-sm text-[#6B6B70]">
        Need to change this visit? It&apos;s within {CHANGE_CUTOFF_HOURS} hours, so please call or text us and we&apos;ll sort it out.
      </p>
    )
  }

  async function send(body: Record<string, unknown>, success: string): Promise<void> {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/customer/jobs/${jobId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = (await res.json()) as { error?: string }
      if (!res.ok) {
        setError(json.error ?? 'Something went wrong')
        return
      }
      setDone(success)
      setMode('idle')
      router.refresh()
    } catch {
      setError('Could not reach the server — try again')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      {done ? <p role="status" className="rounded-lg bg-[#27AE60]/10 px-3 py-2 text-sm font-semibold text-[#1E7D46]">{done}</p> : null}

      {mode === 'idle' ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setMode('reschedule')} className="h-10 rounded-lg border border-black/15 bg-white px-4 text-sm font-semibold hover:border-sky">
            Reschedule
          </button>
          <button type="button" onClick={() => setMode('cancel')} className="h-10 rounded-lg px-4 text-sm font-semibold text-tornado hover:bg-tornado/5">
            Cancel visit
          </button>
        </div>
      ) : null}

      {mode === 'reschedule' ? (
        <div className="space-y-3 rounded-xl border border-black/10 bg-white p-4">
          <label className="block text-sm font-semibold">
            New date
            <input
              type="date"
              min={format(addDays(new Date(), 1), 'yyyy-MM-dd')}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-black/15 px-3 font-normal"
            />
          </label>
          <fieldset>
            <legend className="text-sm font-semibold">Arrival window</legend>
            <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-5">
              {TIME_WINDOWS.map((w) => (
                <label
                  key={w.value}
                  className={cn(
                    'flex cursor-pointer flex-col rounded-lg border px-2.5 py-1.5 text-xs focus-within:ring-2 focus-within:ring-sky/40',
                    window === w.value ? 'border-sky bg-sky-pale ring-1 ring-sky' : 'border-black/15 hover:border-sky/50'
                  )}
                >
                  <input type="radio" name="window" value={w.value} checked={window === w.value} onChange={() => setWindow(w.value)} className="sr-only" />
                  <span className="font-semibold">{w.label}</span>
                  <span className="text-[#6B6B70]">{w.hours}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy || !date || !window}
              onClick={() => void send({ action: 'reschedule', date, window }, 'Your visit was moved. We’ll text you a reminder the day before.')}
              className="h-10 flex-1 rounded-lg bg-sky font-semibold text-white hover:bg-sky-dark disabled:opacity-50"
            >
              {busy ? 'Saving…' : 'Save new time'}
            </button>
            <button type="button" onClick={() => setMode('idle')} className="h-10 rounded-lg px-4 font-semibold text-[#6B6B70] hover:bg-black/5">
              Back
            </button>
          </div>
        </div>
      ) : null}

      {mode === 'cancel' ? (
        <div className="space-y-3 rounded-xl border border-tornado/30 bg-tornado/5 p-4 text-sm">
          <p>
            Cancel this visit?
            {hasDeposit ? ' Your deposit will be refunded to your original payment method within a few business days.' : ''}
            {isMemberVisit ? ' Your included Storm Ready visit goes back to your account.' : ''}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void send({ action: 'cancel' }, 'Your visit was cancelled.')}
              className="h-10 flex-1 rounded-lg bg-tornado font-semibold text-white hover:bg-tornado/90 disabled:opacity-50"
            >
              {busy ? 'Cancelling…' : 'Yes, cancel visit'}
            </button>
            <button type="button" onClick={() => setMode('idle')} className="h-10 rounded-lg px-4 font-semibold text-[#6B6B70] hover:bg-black/5">
              Keep it
            </button>
          </div>
        </div>
      ) : null}

      {error ? <p role="alert" className="text-sm font-semibold text-tornado">{error}</p> : null}
    </div>
  )
}
