import { Plus, Star } from 'lucide-react'
import Link from 'next/link'

import { AdminTopbar } from '@/components/admin/AdminTopbar'
import { JobsFilters } from '@/components/admin/JobsFilters'
import { EmptyState } from '@/components/admin/Panel'
import { StatusPill } from '@/components/admin/StatusPill'
import {
  JOB_LIST_LIMIT,
  JOB_STATUS_FILTERS,
  JOB_WHEN_FILTERS,
  type JobStatusFilter,
  type JobWhenFilter,
} from '@/lib/admin/jobConstants'
import { listJobs } from '@/lib/admin/jobs'
import { formatBusinessDate } from '@/lib/admin/time'
import { jobTimeLabel } from '@/lib/booking/timeWindows'
import { formatCurrency } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'All Jobs · Storm Sweep Admin' }

type SearchParams = { status?: string; when?: string; q?: string }

function pick<T extends string>(value: string | undefined, allowed: readonly T[], fallback: T): T {
  return (allowed as readonly string[]).includes(value ?? '') ? (value as T) : fallback
}

export default async function AdminJobsPage({
  searchParams,
}: {
  searchParams: SearchParams
}): Promise<React.ReactElement> {
  const status = pick<JobStatusFilter>(searchParams.status, JOB_STATUS_FILTERS, 'all')
  const when = pick<JobWhenFilter>(searchParams.when, JOB_WHEN_FILTERS, 'upcoming')
  const q = (searchParams.q ?? '').slice(0, 80)
  const { jobs, truncated } = await listJobs({ status, when, q })

  return (
    <>
      <AdminTopbar title="All Jobs" subtitle={`${jobs.length}${truncated ? '+' : ''} shown`}>
        <Link href="/admin/jobs/new" className="inline-flex h-8 items-center gap-1 rounded-md bg-sky px-3 text-xs font-semibold text-white hover:bg-sky-light">
          <Plus className="size-3.5" aria-hidden="true" /> New booking
        </Link>
      </AdminTopbar>
      <main className="flex-1 space-y-4 overflow-y-auto px-4 py-6 sm:px-7">
        <JobsFilters status={status} when={when} q={q} />

        <section className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#1C1C1F]">
          {jobs.length === 0 ? (
            <EmptyState>
              {q || status !== 'all' || when !== 'upcoming'
                ? 'No jobs match these filters.'
                : 'No upcoming jobs yet. New bookings will appear here.'}
            </EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-white/[0.07] text-[10px] font-bold uppercase tracking-[0.2em] text-[#8A8A8F]">
                    <th className="px-[18px] py-3 font-bold">Customer</th>
                    <th className="px-3 py-3 font-bold">Date · Time</th>
                    <th className="px-3 py-3 font-bold">Services</th>
                    <th className="px-3 py-3 font-bold">Sweeper</th>
                    <th className="px-3 py-3 font-bold">Status</th>
                    <th className="px-3 py-3 font-bold">Photo</th>
                    <th className="px-[18px] py-3 text-right font-bold">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job.id} className="border-b border-white/[0.07] last:border-b-0 hover:bg-white/[0.02]">
                      <td className="px-[18px] py-3">
                        <Link href={`/admin/jobs/${job.id}`} className="group block min-w-0">
                          <span className="flex items-center gap-1 text-[13px] font-semibold text-[#F0F0F0] group-hover:text-sky-light group-hover:underline">
                            {job.customer.name}
                            {job.customer.isMember ? (
                              <Star className="size-3 shrink-0 fill-wheat-light text-wheat-light" aria-label="Storm Ready member" />
                            ) : null}
                          </span>
                          <span className="block truncate text-[11px] text-[#8A8A8F]">{job.address}</span>
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 font-[family-name:var(--font-barlow-condensed)] text-sm font-semibold text-[#F0F0F0]">
                        {job.scheduled_at ? (
                          <>
                            {formatBusinessDate(new Date(job.scheduled_at), { weekday: 'short', month: 'short', day: 'numeric' })}
                            <span className="text-[#8A8A8F]"> · {jobTimeLabel(job.scheduled_at, job.time_window)}</span>
                          </>
                        ) : (
                          <span className="text-[#F0B27A]">Not scheduled</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex max-w-[220px] flex-wrap gap-1">
                          {job.service_type.map((s) => (
                            <span key={s} className="rounded bg-sky/[0.12] px-1.5 py-0.5 text-[10px] font-semibold text-sky-light">
                              {s}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-xs text-[#9A9A9F]">
                        {job.sweeperName ?? <span className="font-semibold text-[#F0B27A]">Unassigned</span>}
                      </td>
                      <td className="px-3 py-3">
                        <StatusPill status={job.status} />
                      </td>
                      <td className="px-3 py-3 text-xs">
                        {job.photo_grade ? (
                          <span className={job.photo_approved ? 'text-[#9A9A9F]' : 'font-semibold text-[#F0B27A]'}>
                            {job.photo_grade}
                            {job.photo_approved ? '' : ' · review'}
                          </span>
                        ) : (
                          <span className="text-[#8A8A8F]">—</span>
                        )}
                      </td>
                      <td className="px-[18px] py-3 text-right font-[family-name:var(--font-barlow-condensed)] text-[15px] font-semibold text-[#F0F0F0]">
                        {formatCurrency(job.service_value ?? job.total_amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        {truncated ? (
          <p className="text-xs text-[#8A8A8F]">
            Showing the first {JOB_LIST_LIMIT}. Narrow the filters or search to find older jobs.
          </p>
        ) : null}
      </main>
    </>
  )
}
