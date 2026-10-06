import { ChevronLeft, ChevronRight, Star } from 'lucide-react'
import Link from 'next/link'

import { AdminTopbar } from '@/components/admin/AdminTopbar'
import { AssignSweeperSelect } from '@/components/admin/AssignSweeperSelect'
import { EmptyState, Panel } from '@/components/admin/Panel'
import { JOB_STATUS_LABEL, StatusPill } from '@/components/admin/StatusPill'
import { getScheduleMonth, listSweepers, type JobListItem, type ScheduleDay } from '@/lib/admin/jobs'
import { formatBusinessDate, formatBusinessTime } from '@/lib/admin/time'
import { cn } from '@/lib/utils'
import type { JobStatus } from '@/types/database'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Schedule · Storm Sweep Admin' }

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MAX_CHIPS = 3

// Status is always also shown as text (chip title, day panel pill); the color is a secondary cue.
const CHIP_CLASS: Record<JobStatus, string> = {
  pending: 'border-l-[#E67E22] bg-[#E67E22]/[0.10]',
  confirmed: 'border-l-sky bg-sky/[0.12]',
  in_progress: 'border-l-sky-light bg-sky/[0.22]',
  complete: 'border-l-[#27AE60] bg-[#27AE60]/[0.10]',
  cancelled: 'border-l-white/20 bg-white/[0.03] line-through opacity-60',
}

const isActive = (j: JobListItem): boolean => j.status !== 'cancelled'

function JobChip({ job }: { job: JobListItem }): React.ReactElement {
  return (
    <Link
      href={`/admin/jobs/${job.id}`}
      title={`${job.customer.name} · ${JOB_STATUS_LABEL[job.status]}${job.sweeperName ? ` · ${job.sweeperName}` : ' · Unassigned'}`}
      className={cn('block truncate rounded-sm border-l-2 px-1.5 py-0.5 text-[11px] text-[#F0F0F0] hover:brightness-125', CHIP_CLASS[job.status])}
    >
      <span className="font-semibold">{job.scheduled_at ? formatBusinessTime(job.scheduled_at).replace(':00', '') : ''}</span>{' '}
      {job.customer.name}
      {!job.sweeper_id && isActive(job) ? <span className="text-[#F0B27A]"> •</span> : null}
    </Link>
  )
}

export default async function AdminSchedulePage({
  searchParams,
}: {
  searchParams: { month?: string; day?: string }
}): Promise<React.ReactElement> {
  const parsed = Number.parseInt(searchParams.month ?? '0', 10)
  const monthOffset = Number.isFinite(parsed) ? Math.max(-24, Math.min(24, parsed)) : 0
  const [{ month, weeks }, sweepers] = await Promise.all([getScheduleMonth(monthOffset), listSweepers()])

  const allDays = weeks.flat()
  const monthDays = allDays.filter((d) => d.inMonth)
  const selected: ScheduleDay =
    allDays.find((d) => d.key === searchParams.day) ??
    monthDays.find((d) => d.isToday) ??
    monthDays[0]

  const monthJobs = monthDays.flatMap((d) => d.jobs).filter(isActive)
  const unassigned = monthJobs.filter((j) => !j.sweeper_id).length
  const monthLabel = formatBusinessDate(month, { month: 'long', year: 'numeric' })
  const qs = (offset: number, day?: string): string => {
    const p = new URLSearchParams()
    if (offset !== 0) p.set('month', String(offset))
    if (day) p.set('day', day)
    const s = p.toString()
    return s ? `/admin/schedule?${s}` : '/admin/schedule'
  }
  const navBtn = 'inline-flex h-8 items-center gap-1 rounded-md border border-white/[0.07] bg-white/[0.04] px-2.5 text-xs font-semibold text-[#F0F0F0] hover:bg-white/[0.08]'

  return (
    <>
      <AdminTopbar
        title="Schedule"
        subtitle={`${monthLabel} · ${monthJobs.length} job${monthJobs.length === 1 ? '' : 's'}${unassigned ? ` · ${unassigned} unassigned` : ''}`}
      >
        <Link href={qs(monthOffset - 1)} className={navBtn} aria-label="Previous month">
          <ChevronLeft className="size-3.5" aria-hidden="true" /> Prev
        </Link>
        {monthOffset !== 0 ? <Link href={qs(0)} className={navBtn}>Today</Link> : null}
        <Link href={qs(monthOffset + 1)} className={navBtn} aria-label="Next month">
          Next <ChevronRight className="size-3.5" aria-hidden="true" />
        </Link>
      </AdminTopbar>

      <main className="flex-1 space-y-4 overflow-y-auto px-4 py-6 sm:px-7">
        <h2 className="font-[family-name:var(--font-bebas)] text-3xl tracking-wide text-white">{monthLabel}</h2>

        {/* Month grid (tablet/desktop) */}
        <section aria-label={`${monthLabel} calendar`} className="hidden overflow-hidden rounded-xl border border-white/[0.07] bg-[#1C1C1F] md:block">
          <div className="grid grid-cols-7 border-b border-white/[0.07] bg-white/[0.02]">
            {WEEKDAYS.map((w) => (
              <div key={w} className="px-2.5 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#8A8A8F]">{w}</div>
            ))}
          </div>
          {weeks.map((week) => (
            <div key={week[0].key} className="grid grid-cols-7 border-b border-white/[0.07] last:border-b-0">
              {week.map((day) => {
                const isSelected = day.key === selected.key
                const extra = day.jobs.length - MAX_CHIPS
                return (
                  <div
                    key={day.key}
                    className={cn(
                      'min-h-28 border-r border-white/[0.07] p-1.5 last:border-r-0',
                      !day.inMonth && 'bg-black/20',
                      isSelected && 'bg-sky/[0.07] ring-1 ring-inset ring-sky/60'
                    )}
                  >
                    <Link
                      href={qs(monthOffset, day.key)}
                      scroll={false}
                      aria-label={`${formatBusinessDate(day.date, { weekday: 'long', month: 'long', day: 'numeric' })}, ${day.jobs.length} job${day.jobs.length === 1 ? '' : 's'}`}
                      aria-current={isSelected ? 'date' : undefined}
                      className={cn(
                        'mb-1 inline-flex size-6 items-center justify-center rounded-full font-[family-name:var(--font-bebas)] text-base leading-none hover:bg-white/10',
                        day.isToday ? 'bg-sky text-white hover:bg-sky' : day.inMonth ? 'text-white' : 'text-[#5A5A5F]'
                      )}
                    >
                      {formatBusinessDate(day.date, { day: 'numeric' })}
                    </Link>
                    <div className="space-y-0.5">
                      {day.jobs.slice(0, MAX_CHIPS).map((job) => (
                        <JobChip key={job.id} job={job} />
                      ))}
                      {extra > 0 ? (
                        <Link href={qs(monthOffset, day.key)} scroll={false} className="block px-1.5 text-[11px] font-semibold text-sky-light hover:underline">
                          +{extra} more
                        </Link>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </section>

        {/* Agenda list (phones) */}
        <section aria-label={`${monthLabel} agenda`} className="space-y-2 md:hidden">
          {monthDays.filter((d) => d.jobs.length > 0).length === 0 ? (
            <EmptyState>No jobs scheduled in {monthLabel}.</EmptyState>
          ) : (
            monthDays
              .filter((d) => d.jobs.length > 0)
              .map((d) => (
                <div key={d.key} className="rounded-xl border border-white/[0.07] bg-[#1C1C1F] p-3">
                  <p className={cn('mb-1.5 text-xs font-bold', d.isToday ? 'text-sky-light' : 'text-[#F0F0F0]')}>
                    {formatBusinessDate(d.date, { weekday: 'short', month: 'short', day: 'numeric' })}
                    {d.isToday ? ' · Today' : ''}
                  </p>
                  <div className="space-y-1">
                    {d.jobs.map((job) => <JobChip key={job.id} job={job} />)}
                  </div>
                </div>
              ))
          )}
        </section>

        {/* Selected day: full details + assignment */}
        <Panel
          title={formatBusinessDate(selected.date, { weekday: 'long', month: 'long', day: 'numeric' })}
          subtitle={`${selected.jobs.length} job${selected.jobs.length === 1 ? '' : 's'}${selected.isToday ? ' · Today' : ''}`}
          bodyClassName="py-1"
        >
          {selected.jobs.length === 0 ? (
            <EmptyState>No jobs on this day. Click a date in the calendar to see its jobs.</EmptyState>
          ) : (
            <ul>
              {selected.jobs.map((job) => {
                const locked = job.status === 'in_progress' || job.status === 'complete' || job.status === 'cancelled'
                return (
                  <li key={job.id} className="grid gap-2 border-b border-white/[0.07] py-3 last:border-b-0 sm:grid-cols-[70px_1fr_auto_200px] sm:items-center sm:gap-4">
                    <p className="font-[family-name:var(--font-barlow-condensed)] text-sm font-semibold text-[#F0F0F0]">
                      {job.scheduled_at ? formatBusinessTime(job.scheduled_at) : '—'}
                    </p>
                    <Link href={`/admin/jobs/${job.id}`} className="group min-w-0">
                      <span className="flex items-center gap-1 text-[13px] font-semibold text-[#F0F0F0] group-hover:text-sky-light group-hover:underline">
                        {job.customer.name}
                        {job.customer.isMember ? <Star className="size-3 shrink-0 fill-wheat-light text-wheat-light" aria-label="Storm Ready member" /> : null}
                      </span>
                      <span className="block truncate text-[11px] text-[#8A8A8F]">{job.address} · {job.service_type.join(' + ')}</span>
                    </Link>
                    <StatusPill status={job.status} />
                    <AssignSweeperSelect jobId={job.id} sweeperId={job.sweeper_id} sweepers={sweepers} locked={locked} />
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>

        <p className="text-[11px] text-[#8A8A8F]">
          <span className="text-[#F0B27A]">•</span> = no Sweeper assigned yet. Click a job to open it; click a date to manage that day.
        </p>
      </main>
    </>
  )
}
