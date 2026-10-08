'use client'

import { useState } from 'react'

type Props = { zip: string; name: string; email: string; phone: string; address: string }

/** Shown on Customer Details when the ZIP is outside the service area. */
export function WaitlistOffer({ zip, name, email, phone, address }: Props): React.ReactElement {
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

  async function join(): Promise<void> {
    setState('busy')
    setMessage(null)
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zip, email, name: name || undefined, phone: phone || undefined, address: address || undefined }),
      })
      if (!res.ok) {
        setState('error')
        setMessage(((await res.json()) as { error?: string }).error ?? 'Couldn’t join the waitlist')
        return
      }
      setState('done')
    } catch {
      setState('error')
      setMessage('Couldn’t reach the server — try again')
    }
  }

  return (
    <div role="status" className="space-y-2 rounded-lg border border-wheat/50 bg-wheat-pale px-4 py-3 text-sm text-shelter">
      <p className="font-semibold">We don&apos;t serve {zip} yet.</p>
      {state === 'done' ? (
        <p>You&apos;re on the waitlist. We&apos;ll email {email} as soon as we start booking in your area.</p>
      ) : (
        <>
          <p>We&apos;re growing out from Norman. Join the waitlist and you&apos;ll be the first to know when we reach you.</p>
          {emailOk ? (
            <button
              type="button"
              disabled={state === 'busy'}
              onClick={() => void join()}
              className="h-9 rounded-md bg-sky px-4 text-sm font-bold text-white hover:bg-sky-light disabled:opacity-60"
            >
              {state === 'busy' ? 'Joining…' : `Join the waitlist for ${zip}`}
            </button>
          ) : (
            <p className="text-xs text-[#6B6B70]">Enter your email above to join the waitlist.</p>
          )}
          {message ? <p className="text-xs text-tornado">{message}</p> : null}
        </>
      )}
    </div>
  )
}
