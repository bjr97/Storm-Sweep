'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

/** Admin: let the Sweeper continue, or end the visit (job → cancelled). */
export function IssueDecision({ jobId, issueId }: { jobId: string; issueId: string }): React.ReactElement {
  const router = useRouter()
  const [note, setNote] = useState('')
  const [confirmEnd, setConfirmEnd] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function decide(decision: 'continue' | 'end_visit'): Promise<void> {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/jobs/${jobId}/issues`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueId, decision, note: note.trim() || null }),
      })
      if (!res.ok) {
        setError(((await res.json()) as { error?: string }).error ?? 'Could not save')
        return
      }
      router.refresh()
    } catch {
      setError('Could not save')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-[11px] text-[#9A9A9F]">
        Message to the Sweeper (optional)
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          placeholder="e.g. OK to continue — skip the far corner"
          className="mt-1 h-9 w-full rounded-md border border-white/10 bg-[#0F0F11] px-2.5 text-sm text-[#F0F0F0] outline-none focus-visible:border-sky focus-visible:ring-2 focus-visible:ring-sky/40"
        />
      </label>
      {!confirmEnd ? (
        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void decide('continue')}
            className="h-9 flex-1 rounded-md bg-sky text-sm font-semibold text-white hover:bg-sky-light disabled:opacity-60"
          >
            OK to continue
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirmEnd(true)}
            className="h-9 flex-1 rounded-md border border-tornado/60 text-sm font-semibold text-[#F1948A] hover:bg-tornado/10 disabled:opacity-60"
          >
            End visit
          </button>
        </div>
      ) : (
        <div className="space-y-2 rounded-md border border-tornado/50 bg-tornado/10 p-2.5 text-xs text-[#F0F0F0]">
          <p>This cancels the job. Handle any refund or reschedule with the customer yourself.</p>
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={() => void decide('end_visit')} className="h-8 flex-1 rounded bg-tornado font-semibold text-white disabled:opacity-60">
              End visit
            </button>
            <button type="button" onClick={() => setConfirmEnd(false)} className="h-8 flex-1 rounded bg-white/[0.08] font-semibold">
              Back
            </button>
          </div>
        </div>
      )}
      {error ? <p role="alert" className="text-[11px] text-[#F1948A]">{error}</p> : null}
    </div>
  )
}
