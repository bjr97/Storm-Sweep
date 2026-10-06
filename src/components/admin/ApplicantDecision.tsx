'use client'

import { Check, Copy } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

type ApplicantDecisionProps = {
  applicantId: string
  applicantName: string
  readyToApprove: boolean
  blockers: string[]
  isPending: boolean
}

type ApproveResult = { smsSent: boolean; tempPassword?: string; loginUrl: string }

const btn =
  'inline-flex h-9 items-center justify-center rounded-md px-4 text-[13px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50'

export function ApplicantDecision({
  applicantId,
  applicantName,
  readyToApprove,
  blockers,
  isPending,
}: ApplicantDecisionProps): React.ReactElement {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState(false)
  const [notes, setNotes] = useState('')
  const [approved, setApproved] = useState<ApproveResult | null>(null)
  const [copied, setCopied] = useState(false)

  async function post(path: string, body: object): Promise<Record<string, unknown> | null> {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const json = (await res.json()) as Record<string, unknown>
      if (!res.ok) {
        setError(typeof json.error === 'string' ? json.error : 'Something went wrong')
        return null
      }
      return json
    } catch {
      setError('Could not reach the server')
      return null
    } finally {
      setBusy(false)
    }
  }

  async function approve(): Promise<void> {
    const json = await post('/api/sweepers/approve', { applicantId })
    if (json) {
      setApproved(json.data as ApproveResult)
      router.refresh()
    }
  }

  async function reject(): Promise<void> {
    const json = await post('/api/sweepers/reject', { applicantId, adminNotes: notes.trim() || undefined })
    if (json) {
      setRejecting(false)
      router.refresh()
    }
  }

  if (approved) {
    return (
      <div className="space-y-2 rounded-lg border border-[#27AE60]/30 bg-[#27AE60]/10 p-3 text-[13px] text-[#F0F0F0]">
        <p className="flex items-center gap-1.5 font-semibold text-[#2ECC71]">
          <Check className="size-4" aria-hidden="true" /> {applicantName} is now a Sweeper
        </p>
        {approved.smsSent ? (
          <p className="text-[#9A9A9F]">Their login details were sent by text.</p>
        ) : (
          <>
            <p className="text-[#F0B27A]">
              The welcome text could not be sent (SMS isn&apos;t set up). Share these login details with them
              directly — this password is shown only once:
            </p>
            <div className="rounded-md bg-[#0F0F11] p-2.5 font-mono text-xs">
              <p>Login: {approved.loginUrl}</p>
              <p className="mt-1 flex items-center gap-2">
                Temp password: <span className="select-all font-semibold text-white">{approved.tempPassword}</span>
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard.writeText(approved.tempPassword ?? '')
                    setCopied(true)
                  }}
                  className="inline-flex items-center gap-1 rounded border border-white/10 px-1.5 py-0.5 font-sans text-[11px] text-[#F0F0F0] hover:bg-white/[0.06]"
                >
                  <Copy className="size-3" aria-hidden="true" /> {copied ? 'Copied' : 'Copy'}
                </button>
              </p>
            </div>
            <p className="text-[11px] text-[#8A8A8F]">Ask them to change it after their first sign-in.</p>
          </>
        )}
      </div>
    )
  }

  if (!isPending) {
    return <p className="text-[13px] text-[#8A8A8F]">This application has already been decided.</p>
  }

  return (
    <div className="space-y-3">
      {!readyToApprove ? (
        <ul className="space-y-1 rounded-lg border border-[#E67E22]/30 bg-[#E67E22]/10 p-3 text-[12px] text-[#F0B27A]">
          <li className="font-semibold">Can&apos;t approve yet:</li>
          {blockers.map((b) => (
            <li key={b}>· {b}</li>
          ))}
        </ul>
      ) : null}

      {rejecting ? (
        <div className="space-y-2">
          <label htmlFor="reject-notes" className="block text-[11px] font-bold uppercase tracking-[0.15em] text-[#8A8A8F]">
            Internal note (optional, not sent)
          </label>
          <textarea
            id="reject-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={1000}
            rows={3}
            className="w-full rounded-md border border-white/10 bg-[#0F0F11] p-2 text-[13px] text-[#F0F0F0] outline-none focus-visible:border-sky"
          />
          <p className="text-[11px] text-[#8A8A8F]">They&apos;ll receive a polite decline text (once SMS is set up).</p>
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={() => void reject()} className={`${btn} bg-tornado text-white hover:bg-tornado/85`}>
              Confirm reject
            </button>
            <button type="button" disabled={busy} onClick={() => setRejecting(false)} className={`${btn} border border-white/10 text-[#F0F0F0] hover:bg-white/[0.06]`}>
              Back
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || !readyToApprove}
            onClick={() => void approve()}
            className={`${btn} bg-sky text-white hover:bg-sky-light`}
          >
            {busy ? 'Working…' : 'Approve & create account'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setRejecting(true)}
            className={`${btn} border border-tornado/50 text-[#F1948A] hover:bg-tornado/15`}
          >
            Reject
          </button>
        </div>
      )}
      {error ? <p className="text-[13px] text-[#F1948A]">{error}</p> : null}
    </div>
  )
}
