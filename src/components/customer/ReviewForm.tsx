'use client'

import { Star } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { cn } from '@/lib/utils'

/** 1–5 stars + comment. 4–5★ then offers Google (when a review link is configured). */
export function ReviewForm({ jobId, sweeperFirstName }: { jobId: string; sweeperFirstName: string | null }): React.ReactElement {
  const router = useRouter()
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState<{ askGoogle: boolean } | null>(null)
  const googleUrl = process.env.NEXT_PUBLIC_GOOGLE_REVIEW_URL

  async function submit(): Promise<void> {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/customer/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, rating, body: body.trim() || null }),
      })
      const json = (await res.json()) as { error?: string; data?: { askGoogle: boolean } }
      if (!res.ok || !json.data) {
        setError(json.error ?? 'Could not save your review')
        return
      }
      setSubmitted(json.data)
    } catch {
      setError('Could not reach the server — try again')
    } finally {
      setBusy(false)
    }
  }

  if (submitted) {
    return (
      <div role="status" className="space-y-3 text-sm">
        <p className="font-semibold">Thank you for the feedback!</p>
        {submitted.askGoogle ? (
          googleUrl ? (
            <>
              <p>Would you share it on Google? It takes 30 seconds and helps a small local business more than anything.</p>
              <a
                href={googleUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center rounded-lg bg-sky px-4 font-semibold text-white hover:bg-sky-dark"
              >
                Review us on Google
              </a>
            </>
          ) : null
        ) : (
          <p>We&apos;re sorry it wasn&apos;t perfect. The owner reads every review and will reach out to make it right.</p>
        )}
        <button type="button" onClick={() => router.refresh()} className="block text-xs font-semibold text-sky-dark underline">
          Done
        </button>
      </div>
    )
  }

  const shown = hover || rating
  return (
    <div className="space-y-3">
      <p className="text-sm">How did {sweeperFirstName ?? 'your Sweeper'} do?</p>
      <div className="flex gap-1" role="radiogroup" aria-label="Rating" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={`${n} star${n === 1 ? '' : 's'}`}
            onClick={() => setRating(n)}
            onMouseEnter={() => setHover(n)}
            className="rounded p-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky"
          >
            <Star className={cn('size-8', n <= shown ? 'fill-wheat text-wheat' : 'text-black/20')} aria-hidden="true" />
          </button>
        ))}
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={1000}
        rows={3}
        placeholder="Anything you'd like to tell us? (optional)"
        aria-label="Comment"
        className="w-full rounded-lg border border-black/15 bg-white p-3 text-sm outline-none focus-visible:border-sky focus-visible:ring-2 focus-visible:ring-sky/30"
      />
      <button
        type="button"
        onClick={() => void submit()}
        disabled={busy || rating === 0}
        className="h-10 rounded-lg bg-sky px-5 font-semibold text-white hover:bg-sky-dark disabled:opacity-50"
      >
        {busy ? 'Sending…' : 'Submit review'}
      </button>
      {error ? <p role="alert" className="text-sm font-semibold text-tornado">{error}</p> : null}
    </div>
  )
}
