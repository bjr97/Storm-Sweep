'use client'

import { CheckCircle2 } from 'lucide-react'

import { useRunAction } from '@/components/sweeper/run/useRunAction'

export function CompleteButton({ jobId, blockers }: { jobId: string; blockers: string[] }): React.ReactElement {
  const { run, busy, error } = useRunAction(jobId)
  const ready = blockers.length === 0
  return (
    <div className="space-y-2">
      {!ready ? (
        <ul className="space-y-1 text-sm text-[#F0B27A]">
          {blockers.map((b) => (
            <li key={b}>• {b}</li>
          ))}
        </ul>
      ) : null}
      <button
        type="button"
        disabled={!ready || busy}
        onClick={() => void run({ action: 'complete' })}
        className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#27AE60] font-[family-name:var(--font-barlow-condensed)] text-lg font-bold uppercase tracking-wider text-white hover:bg-[#2ECC71] disabled:cursor-not-allowed disabled:bg-white/[0.06] disabled:text-[#8A8A8F]"
      >
        <CheckCircle2 className="size-5" aria-hidden="true" /> {busy ? 'Completing…' : 'Mark job complete'}
      </button>
      {error ? <p role="alert" className="text-sm font-semibold text-[#F1948A]">{error}</p> : null}
    </div>
  )
}
