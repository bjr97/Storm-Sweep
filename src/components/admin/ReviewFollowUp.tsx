'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

/** Private follow-up note + "followed up" toggle for a review. */
export function ReviewFollowUp({
  reviewId,
  followedUp,
  note,
}: {
  reviewId: string
  followedUp: boolean
  note: string | null
}): React.ReactElement {
  const router = useRouter()
  const [text, setText] = useState(note ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save(next: boolean): Promise<void> {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ followedUp: next, note: text.trim() || null }),
      })
      if (!res.ok) {
        setError(((await res.json()) as { error?: string }).error ?? 'Could not save')
        return
      }
      router.refresh()
    } catch {
      setError('Could not reach the server')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor={`note-${reviewId}`}>Private note</label>
      <input
        id={`note-${reviewId}`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={1000}
        placeholder="Private note — e.g. called, re-cleaned for free"
        className="h-8 min-w-0 flex-1 rounded-md border border-white/10 bg-[#0F0F11] px-2.5 text-xs text-[#F0F0F0] outline-none focus-visible:border-sky"
      />
      {followedUp ? (
        <button type="button" disabled={busy} onClick={() => void save(false)} className="h-8 rounded-md px-2.5 text-xs font-semibold text-[#9A9A9F] hover:bg-white/[0.06]">
          Reopen
        </button>
      ) : (
        <button type="button" disabled={busy} onClick={() => void save(true)} className="h-8 rounded-md bg-sky px-3 text-xs font-bold text-white hover:bg-sky-light disabled:opacity-60">
          {busy ? 'Saving…' : 'Mark followed up'}
        </button>
      )}
      {followedUp && text !== (note ?? '') ? (
        <button type="button" disabled={busy} onClick={() => void save(true)} className="h-8 rounded-md bg-white/[0.08] px-2.5 text-xs font-semibold text-[#F0F0F0]">
          Save note
        </button>
      ) : null}
      {error ? <p role="alert" className="w-full text-[11px] text-[#F1948A]">{error}</p> : null}
    </div>
  )
}
