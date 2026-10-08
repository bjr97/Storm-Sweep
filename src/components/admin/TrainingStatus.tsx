'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { cn } from '@/lib/utils'

type Status = 'done' | 'waived' | 'in_progress' | 'not_started'

const LABEL: Record<Status, string> = { done: 'Trained', waived: 'Training waived', in_progress: 'Training', not_started: 'Not trained' }

/** Crew page: a Sweeper's onboarding status + waive / reset. */
export function TrainingStatus({ sweeperId, status, read, total }: { sweeperId: string; status: Status; read: number; total: number }): React.ReactElement {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const act = async (action: 'waive' | 'unwaive' | 'reset'): Promise<void> => {
    setBusy(true)
    await fetch(`/api/sweepers/${sweeperId}/training`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) })
    setBusy(false)
    router.refresh()
  }
  const ok = status === 'done' || status === 'waived'
  const btn = 'text-[11px] font-semibold text-sky-light hover:underline disabled:opacity-50'
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-2">
      <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider', ok ? 'bg-[#27AE60]/15 text-[#2ECC71]' : 'bg-wheat/15 text-wheat-light')}>
        {LABEL[status]}
        {status === 'in_progress' ? ` ${read}/${total}` : ''}
      </span>
      {status === 'waived' ? (
        <button type="button" disabled={busy} onClick={() => void act('unwaive')} className={btn}>
          Require training
        </button>
      ) : !ok ? (
        <button type="button" disabled={busy} onClick={() => void act('waive')} className={btn} title="For experienced Sweepers: let them claim without the course">
          Waive
        </button>
      ) : (
        <button type="button" disabled={busy} onClick={() => void act('reset')} className={btn} title="Make them redo the course">
          Reset
        </button>
      )}
    </div>
  )
}
