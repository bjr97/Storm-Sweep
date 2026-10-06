'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { cn } from '@/lib/utils'

export function ClaimButton({ jobId, disabled, disabledLabel }: { jobId: string; disabled?: boolean; disabledLabel?: string }): React.ReactElement {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function claim(): Promise<void> {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/jobs/${jobId}/claim`, { method: 'POST' })
      const body = (await res.json()) as { error?: string }
      if (!res.ok) {
        setError(body.error ?? 'Could not claim this job')
        if (res.status === 409) router.refresh()
        return
      }
      router.refresh()
    } catch {
      setError('No connection — try again')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={() => void claim()}
        disabled={busy || disabled}
        className={cn(
          'h-12 w-full rounded-lg font-[family-name:var(--font-barlow-condensed)] text-base font-bold uppercase tracking-wider text-white transition-colors',
          disabled ? 'cursor-not-allowed bg-white/[0.06] text-[#8A8A8F]' : 'bg-sky hover:bg-sky-light disabled:opacity-60'
        )}
      >
        {disabled ? disabledLabel ?? 'Unavailable' : busy ? 'Claiming…' : 'Claim job'}
      </button>
      {error ? (
        <p role="alert" className="text-xs font-semibold text-[#F1948A]">
          {error}
        </p>
      ) : null}
    </div>
  )
}
