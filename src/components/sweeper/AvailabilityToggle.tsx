'use client'

import { useState } from 'react'

import { cn } from '@/lib/utils'

/** Online/offline switch — tells the office whether to count on you for new jobs. */
export function AvailabilityToggle({ initial }: { initial: boolean }): React.ReactElement {
  const [on, setOn] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function flip(): Promise<void> {
    const next = !on
    setOn(next)
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/sweepers/availability', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ available: next }),
      })
      if (!res.ok) throw new Error()
    } catch {
      setOn(!next)
      setError('Couldn’t update — try again')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 border-t border-white/[0.07] pt-3">
      <div>
        <p className="text-sm font-semibold text-white">{on ? 'Available for new jobs' : 'Off — not taking new jobs'}</p>
        <p className="text-[11px] text-[#9A9A9F]">{on ? 'The office can count on you for new work.' : 'You can still see and finish your jobs.'}</p>
        {error ? <p role="alert" className="text-[11px] font-semibold text-[#F1948A]">{error}</p> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label="Available for new jobs"
        disabled={busy}
        onClick={() => void flip()}
        className={cn('relative h-8 w-14 shrink-0 rounded-full transition-colors disabled:opacity-60', on ? 'bg-[#27AE60]' : 'bg-white/20')}
      >
        <span className={cn('absolute top-1 size-6 rounded-full bg-white shadow transition-all', on ? 'left-7' : 'left-1')} />
      </button>
    </div>
  )
}
