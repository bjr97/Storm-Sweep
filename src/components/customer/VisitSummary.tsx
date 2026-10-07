import { CalendarDays, Clock, MapPin, User } from 'lucide-react'

import { formatBusinessDate } from '@/lib/admin/time'
import { jobTimeLabel } from '@/lib/booking/timeWindows'
import type { CustomerVisit } from '@/lib/customer/portal'
import { CUSTOMER_STATUS_LABEL } from '@/lib/customer/rules'
import { cn } from '@/lib/utils'

const STATUS_STYLE: Record<CustomerVisit['status'], string> = {
  pending: 'bg-[#E67E22]/10 text-[#A85A12]',
  confirmed: 'bg-sky/10 text-sky-dark',
  in_progress: 'bg-sky/15 text-sky-dark',
  complete: 'bg-[#27AE60]/10 text-[#1E7D46]',
  cancelled: 'bg-black/5 text-[#6B6B70]',
}

export function StatusBadge({ status }: { status: CustomerVisit['status'] }): React.ReactElement {
  return <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold', STATUS_STYLE[status])}>{CUSTOMER_STATUS_LABEL[status]}</span>
}

export function VisitFacts({ visit }: { visit: CustomerVisit }): React.ReactElement {
  return (
    <div className="space-y-1.5 text-sm">
      <p className="flex flex-wrap gap-x-4 gap-y-1">
        <span className="inline-flex items-center gap-1.5 font-semibold">
          <CalendarDays className="size-4 text-sky" aria-hidden="true" />
          {visit.scheduled_at
            ? formatBusinessDate(new Date(visit.scheduled_at), { weekday: 'long', month: 'long', day: 'numeric' })
            : 'Date to be confirmed'}
        </span>
        <span className="inline-flex items-center gap-1.5 text-[#4A4A50]">
          <Clock className="size-4 text-sky" aria-hidden="true" />
          {jobTimeLabel(visit.scheduled_at, visit.time_window)}
        </span>
      </p>
      <p className="flex items-start gap-1.5 text-[#4A4A50]">
        <MapPin className="mt-0.5 size-4 shrink-0 text-sky" aria-hidden="true" />
        {visit.address}
      </p>
      {visit.sweeperFirstName ? (
        <p className="flex items-center gap-1.5 text-[#4A4A50]">
          <User className="size-4 text-sky" aria-hidden="true" />
          Your Sweeper: <span className="font-semibold text-shelter">{visit.sweeperFirstName}</span>
        </p>
      ) : null}
      <p className="text-[#4A4A50]">{visit.service_type.join(' · ')}</p>
    </div>
  )
}
