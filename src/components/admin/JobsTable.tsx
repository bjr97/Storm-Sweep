import { Check, Star } from 'lucide-react'

import { EmptyState } from '@/components/admin/Panel'
import type { TodayJob } from '@/lib/admin/dashboard'
import { formatBusinessTime } from '@/lib/admin/time'
import { cn, formatCurrency } from '@/lib/utils'
import type { JobStatus } from '@/types/database'

const STATUS: Record<JobStatus, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-[#E67E22]/15 text-[#F0B27A]' },
  confirmed: { label: 'Upcoming', className: 'bg-white/[0.06] text-[#9A9A9F]' },
  in_progress: { label: 'In progress', className: 'bg-sky/20 text-sky-light' },
  complete: { label: 'Done', className: 'bg-[#27AE60]/15 text-[#2ECC71]' },
  cancelled: { label: 'Cancelled', className: 'bg-white/[0.04] text-[#8A8A8F] line-through' },
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

export function JobsTable({ jobs }: { jobs: TodayJob[] }): React.ReactElement {
  if (jobs.length === 0) {
    return <EmptyState>No jobs scheduled today.</EmptyState>
  }

  return (
    <div className="-mx-[18px] overflow-x-auto px-[18px]">
      <table className="w-full min-w-[640px] border-collapse text-left">
        <thead>
          <tr className="border-b border-white/[0.07] text-[10px] font-bold uppercase tracking-[0.2em] text-[#8A8A8F]">
            <th className="w-[30%] pb-2.5 font-bold">Customer</th>
            <th className="pb-2.5 font-bold">Time</th>
            <th className="pb-2.5 font-bold">Services</th>
            <th className="pb-2.5 font-bold">Sweeper</th>
            <th className="pb-2.5 font-bold">Status</th>
            <th className="pb-2.5 text-right font-bold">Value</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => {
            const status = STATUS[job.status]
            return (
              <tr key={job.id} className="border-b border-white/[0.07] last:border-b-0">
                <td className="py-3 pr-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sky-dark font-[family-name:var(--font-bebas)] text-[11px] tracking-wider text-white">
                      {initials(job.customerName)}
                    </div>
                    <div className="min-w-0">
                      <p className="flex items-center gap-1 truncate text-[13px] font-semibold text-[#F0F0F0]">
                        {job.customerName}
                        {job.isMember ? (
                          <Star className="size-3 shrink-0 fill-wheat-light text-wheat-light" aria-label="Storm Ready member" />
                        ) : null}
                      </p>
                      <p className="truncate text-[11px] text-[#8A8A8F]">{job.address}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 pr-3 font-[family-name:var(--font-barlow-condensed)] text-sm font-semibold text-[#F0F0F0]">
                  {job.time ? formatBusinessTime(job.time) : '—'}
                </td>
                <td className="py-3 pr-3">
                  <div className="flex flex-wrap gap-1">
                    {job.services.map((service) => (
                      <span key={service} className="rounded bg-sky/[0.12] px-1.5 py-0.5 text-[10px] font-semibold text-sky-light">
                        {service}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="py-3 pr-3 text-xs text-[#9A9A9F]">
                  {job.sweeperName ?? <span className="text-[#F0B27A]">Unassigned</span>}
                </td>
                <td className="py-3 pr-3">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide',
                      status.className
                    )}
                  >
                    {job.status === 'complete' ? <Check className="size-3" aria-hidden="true" /> : null}
                    {status.label}
                  </span>
                </td>
                <td className="py-3 text-right font-[family-name:var(--font-barlow-condensed)] text-[15px] font-semibold text-[#F0F0F0]">
                  {formatCurrency(job.value)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
