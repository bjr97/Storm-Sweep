'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { HELP_TOPICS } from '@/lib/help'
import type { HelpTopic } from '@/types/database'

type VisitOption = { id: string; label: string }

const field = 'mt-1 block w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm text-shelter'

/** "Need help?" form — saved for the office, who also get a text + email. */
export function HelpForm({ visits, initialJobId }: { visits: VisitOption[]; initialJobId: string | null }): React.ReactElement {
  const router = useRouter()
  const [topic, setTopic] = useState<HelpTopic>('visit')
  const [jobId, setJobId] = useState<string>(initialJobId && visits.some((v) => v.id === initialJobId) ? initialJobId : '')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function send(): Promise<void> {
    if (!message.trim()) {
      setError('Tell us how we can help')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/customer/help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, message, jobId: jobId || null }),
      })
      if (!res.ok) {
        setError(((await res.json()) as { error?: string }).error ?? 'Could not send your message')
        return
      }
      setSent(true)
      setMessage('')
      router.refresh()
    } catch {
      setError('Could not reach the server, please try again')
    } finally {
      setBusy(false)
    }
  }

  if (sent) {
    return (
      <div role="status" className="space-y-2 rounded-lg bg-[#27AE60]/10 px-4 py-3 text-sm text-[#1E7D46]">
        <p className="font-semibold">Got it, thanks! We&apos;ll get back to you by text or email soon.</p>
        <button type="button" onClick={() => setSent(false)} className="text-xs font-semibold underline underline-offset-2">
          Send another message
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold text-shelter">
        What&apos;s it about?
        <select value={topic} onChange={(e) => setTopic(e.target.value as HelpTopic)} className={field}>
          {HELP_TOPICS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
      {visits.length > 0 ? (
        <label className="block text-sm font-semibold text-shelter">
          Which visit? <span className="font-normal text-[#6B6B70]">(optional)</span>
          <select value={jobId} onChange={(e) => setJobId(e.target.value)} className={field}>
            <option value="">Not about a specific visit</option>
            {visits.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <label className="block text-sm font-semibold text-shelter">
        Your message
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5} maxLength={2000} placeholder="How can we help?" className={field} />
      </label>
      {error ? (
        <p role="alert" className="text-sm text-tornado">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        disabled={busy}
        onClick={() => void send()}
        className="h-10 rounded-lg bg-sky px-5 text-sm font-bold text-white hover:bg-sky-dark disabled:opacity-60"
      >
        {busy ? 'Sending…' : 'Send message'}
      </button>
    </div>
  )
}
