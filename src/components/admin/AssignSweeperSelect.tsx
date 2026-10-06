'use client'

import { useJobUpdate } from '@/components/admin/useJobUpdate'
import type { SweeperOption } from '@/lib/admin/jobs'
import { cn } from '@/lib/utils'

type AssignSweeperSelectProps = {
  jobId: string
  sweeperId: string | null
  sweepers: SweeperOption[]
  /** Jobs in progress / complete are locked to their Sweeper. */
  locked?: boolean
  compact?: boolean
}

export function AssignSweeperSelect({
  jobId,
  sweeperId,
  sweepers,
  locked = false,
  compact = false,
}: AssignSweeperSelectProps): React.ReactElement {
  const { update, saving, error } = useJobUpdate(jobId)

  return (
    <div className="min-w-0">
      <select
        aria-label="Assigned Sweeper"
        value={sweeperId ?? ''}
        disabled={saving || locked || sweepers.length === 0}
        onChange={(e) => void update({ sweeperId: e.target.value || null })}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'w-full rounded-md border border-white/10 bg-[#0F0F11] text-[#F0F0F0] outline-none focus-visible:border-sky focus-visible:ring-2 focus-visible:ring-sky/40 disabled:cursor-not-allowed disabled:opacity-60',
          compact ? 'h-7 px-1.5 text-[11px]' : 'h-9 px-2.5 text-sm',
          !sweeperId && 'text-[#F0B27A]'
        )}
      >
        <option value="">{sweepers.length === 0 ? 'No Sweepers yet' : 'Unassigned'}</option>
        {sweepers.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      {error ? <p className="mt-1 text-[11px] text-[#F1948A]">{error}</p> : null}
    </div>
  )
}
