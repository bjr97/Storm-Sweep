'use client'

import { useState } from 'react'

import { cn } from '@/lib/utils'

type Target = { demo: 'customer' | 'sweeper' } | { userId: string }

/** Switch this browser into a customer/Sweeper view (see /api/admin/view-as). */
export function ViewAsButton({ target, label, primary = false }: { target: Target; label: string; primary?: boolean }): React.ReactElement {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function go(): Promise<void> {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/view-as', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(target),
      })
      const json = (await res.json()) as { data?: { redirect: string }; error?: string }
      if (!res.ok || !json.data) {
        setError(json.error ?? 'Could not switch')
        setBusy(false)
        return
      }
      window.location.assign(json.data.redirect)
    } catch {
      setError('Could not reach the server')
      setBusy(false)
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={() => void go()}
        className={cn(
          'h-8 rounded-md px-3 text-xs font-bold disabled:opacity-60',
          primary ? 'bg-sky text-white hover:bg-sky-light' : 'border border-white/10 bg-white/[0.04] text-[#F0F0F0] hover:bg-white/[0.08]'
        )}
      >
        {busy ? 'Switching…' : label}
      </button>
      {error ? <span role="alert" className="text-[11px] text-[#F1948A]">{error}</span> : null}
    </span>
  )
}

const RESET_LABELS = { idle: 'Reset demo data', busy: 'Resetting…', done: 'Demo data reset ✓', error: 'Reset failed, try again' } as const

/** Wipe and rebuild the demo accounts' sample data. */
export function ResetDemoButton(): React.ReactElement {
  const [state, setState] = useState<keyof typeof RESET_LABELS>('idle')
  return (
    <button
      type="button"
      disabled={state === 'busy'}
      onClick={() => {
        setState('busy')
        fetch('/api/admin/demo/reset', { method: 'POST' })
          .then((r) => setState(r.ok ? 'done' : 'error'))
          .catch(() => setState('error'))
      }}
      className="h-8 rounded-md border border-white/10 bg-white/[0.04] px-3 text-xs font-semibold text-[#F0F0F0] hover:bg-white/[0.08] disabled:opacity-60"
    >
      {RESET_LABELS[state]}
    </button>
  )
}
