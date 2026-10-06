'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { JOB_BOARD } from '@/lib/sweepers/jobBoard'

/** Two-step inline confirm (no browser dialogs). Warns when the drop counts as late. */
export function DropButton({ jobId, late }: { jobId: string; late: boolean }): React.ReactElement {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function drop(): Promise<void> {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/jobs/${jobId}/drop`, { method: 'POST' })
      const body = (await res.json()) as { error?: string }
      if (!res.ok) {
        setError(body.error ?? 'Could not drop this job')
        return
      }
      router.refresh()
    } catch {
      setError('No connection — try again')
    } finally {
      setBusy(false)
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-xs font-semibold text-[#9A9A9F] underline-offset-2 hover:text-white hover:underline"
      >
        Can&apos;t make it? Drop job
      </button>
    )
  }

  return (
    <div className="space-y-2 rounded-lg border border-white/[0.1] bg-white/[0.03] p-3">
      <p className="text-xs text-[#F0F0F0]">
        {late
          ? `This job is less than ${JOB_BOARD.FREE_DROP_HOURS} hours away. Dropping now counts as a late drop and lowers your priority score.`
          : 'The job goes back on the board for other Sweepers. No penalty.'}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void drop()}
          disabled={busy}
          className="h-10 flex-1 rounded-md bg-tornado text-sm font-bold text-white hover:bg-tornado/90 disabled:opacity-60"
        >
          {busy ? 'Dropping…' : late ? 'Drop anyway' : 'Drop job'}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="h-10 flex-1 rounded-md bg-white/[0.06] text-sm font-semibold text-[#F0F0F0] hover:bg-white/[0.1]"
        >
          Keep it
        </button>
      </div>
      {error ? <p role="alert" className="text-xs font-semibold text-[#F1948A]">{error}</p> : null}
    </div>
  )
}
