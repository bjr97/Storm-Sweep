import { ChevronLeft, ChevronRight, Star } from 'lucide-react'
import Link from 'next/link'

import { AdminTopbar } from '@/components/admin/AdminTopbar'
import { AssignSweeperSelect } from '@/components/admin/AssignSweeperSelect'
import { JOB_STATUS_LABEL } from '@/components/admin/StatusPill'
import { getScheduleWeek, listSweepers } from '@/lib/admin/jobs'
import { formatBusinessDate, formatBusinessTime } from '@/lib/admin/time'
import { cn } from '@/lib/utils'
import type { JobStatus } from '@/types/database'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Schedule · Storm Sweep Admin' }

// Status is shown as text on every block; the left border color is a secondary cue.
const BLOCK_CLASS: Record<JobStatus, string> = {
  pending: 'border-l-[#E67E22] bg-[#E67E22]/[0.08]',
  confirmed: 'border-l-sky bg-sky/[0.10]',
  in_progress: 'border-l-sky-light bg-sky/[0.18]',
  complete: 'border-l-[#27AE60] bg-[#27AE60]/[0.08]',
  cancelled: 'border-l-white/20 bg-white/[0.03] opacity-60',
}

export default async function AdminSchedulePage({
  searchParams,
}: {
  searchParams: { week?: string }
}): Promise<React.ReactElement> {
  const parsed = Number.parseInt(searchParams.week ?? '0', 10)
  const weekOffset = Number.isFinite(parsed) ? Math.max(-52, Math.min(52, parsed)) : 0
  const [{ range, days }, sweepers] = await Promise.all([getScheduleWeek(weekOffset), listSweepers()])

  const jobCount = days.reduce((n, d) => n + d.jobs.filter((j) => j.status !== 'cancelled').length, 0)
  const unassigned = days.reduce((n, d) => n + d.jobs.filter((j) => !j.sweeper_id && j.status !== 'cancelled').length, 0)
  const lastDay = new Date(range.end.getTime() - 1)
  const title = `${formatBusinessDate(range.start, { month: 'short', day: 'numeric' })} – ${formatBusinessDate(lastDay, { month: 'short', day: 'numeric', year: 'numeric' })}`
  const navBtn = 'inline-flex h-8 items-center gap-1 rounded-md border border-white/[0.07] bg-white/[0.04] px-2.5 text-xs font-semibold text-[#F0F0F0] hover:bg-white/[0.08]'

  return (
    <>
      <AdminTopbar title="Schedule" subtitle={`${title} · ${jobCount} job${jobCount === 1 ? '' : 's'}${unassigned ? ` · ${unassigned} unassigned` : ''}`}>
        <Link href={`/admin/schedule?week=${weekOffset - 1}`} className={navBtn} aria-label="Previous week">
          <ChevronLeft className="size-3.5" aria-hidden="true" /> Prev
        </Link>
        {weekOffset !== 0 ? (
          <Link href="/admin/schedule" className={navBtn}>This week</Link>
        ) : null}
        <Link href={`/admin/schedule?week=${weekOffset + 1}`} className={navBtn} aria-label="Next week">
          Next <ChevronRight className="size-3.5" aria-hidden="true" />
        </Link>
      </AdminTopbar>

      <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-7">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
          {days.map((day) => (
            <section
              key={day.date.toISOString()}
              aria-label={formatBusinessDate(day.date, { weekday: 'long', month: 'long', day: 'numeric' })}
              className={cn(
                'flex min-h-40 flex-col overflow-hidden rounded-xl border border-white/[0.07] bg-[#1C1C1F]',
                day.isToday && 'border-t-2 border-t-sky'
              )}
            >
              <header className="border-b border-white/[0.07] bg-white/[0.02] px-3.5 pb-2.5 pt-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8A8A8F]">
                  {formatBusinessDate(day.date, { weekday: 'short' })}
                  {day.isToday ? ' · Today' : ''}
                </p>
                <p className={cn('font-[family-name:var(--font-bebas)] text-[26px] leading-none', day.isToday ? 'text-sky-light' : 'text-white')}>
                  {formatBusinessDate(day.date, { day: 'numeric' })}
                </p>
              </header>
              <div className="flex flex-1 flex-col gap-1.5 p-2.5">
                {day.jobs.length === 0 ? (
                  <p className="py-4 text-center text-[11px] italic text-[#8A8A8F]">No jobs</p>
                ) : (
                  day.jobs.map((job) => (
                    <article key={job.id} className={cn('rounded-md border-l-[3px] p-2', BLOCK_CLASS[job.status])}>
                      <Link href={`/admin/jobs/${job.id}`} className="group block">
                        <p className="font-[family-name:var(--font-barlow-condensed)] text-[11px] font-semibold text-[#F0F0F0]">
                          {job.scheduled_at ? formatBusinessTime(job.scheduled_at) : '—'}
                          <span className="font-[family-name:var(--font-barlow)] font-medium text-[#9A9A9F]"> · {JOB_STATUS_LABEL[job.status]}</span>
                        </p>
                        <p className="flex items-center gap-1 truncate text-[12px] font-semibold text-[#F0F0F0] group-hover:text-sky-light group-hover:underline">
                          {job.customer.name}
                          {job.customer.isMember ? <Star className="size-3 shrink-0 fill-wheat-light text-wheat-light" aria-label="Storm Ready member" /> : null}
                        </p>
                        <p className="truncate text-[10px] text-[#8A8A8F]">{job.service_type.join(' + ')}</p>
                      </Link>
                      <div className="mt-1.5">
                        <AssignSweeperSelect
                          jobId={job.id}
                          sweeperId={job.sweeper_id}
                          sweepers={sweepers}
                          locked={job.status === 'in_progress' || job.status === 'complete' || job.status === 'cancelled'}
                          compact
                        />
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          ))}
        </div>
      </main>
    </>
  )
}
