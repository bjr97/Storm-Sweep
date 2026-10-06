import { Check } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { JobStatus } from '@/types/database'

export const JOB_STATUS_LABEL: Record<JobStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  in_progress: 'In progress',
  complete: 'Done',
  cancelled: 'Cancelled',
}

const STATUS_CLASS: Record<JobStatus, string> = {
  pending: 'bg-[#E67E22]/15 text-[#F0B27A]',
  confirmed: 'bg-white/[0.06] text-[#C8C8CC]',
  in_progress: 'bg-sky/20 text-sky-light',
  complete: 'bg-[#27AE60]/15 text-[#2ECC71]',
  cancelled: 'bg-white/[0.04] text-[#8A8A8F] line-through',
}

export function StatusPill({ status }: { status: JobStatus }): React.ReactElement {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide',
        STATUS_CLASS[status]
      )}
    >
      {status === 'complete' ? <Check className="size-3" aria-hidden="true" /> : null}
      {JOB_STATUS_LABEL[status]}
    </span>
  )
}
