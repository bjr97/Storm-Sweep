import { Check, Minus } from 'lucide-react'
import Link from 'next/link'

import { AdminTopbar } from '@/components/admin/AdminTopbar'
import { EmptyState } from '@/components/admin/Panel'
import { APPLICANT_STATUS_FILTERS, listApplicants, type ApplicantStatusFilter } from '@/lib/admin/applicants'
import { formatRelative } from '@/lib/admin/time'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Applicants · Storm Sweep Admin' }

const TAB_LABEL: Record<ApplicantStatusFilter, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  all: 'All',
}

const AVAILABILITY: Record<string, string> = { weekdays: 'Weekdays', weekends: 'Weekends', both: 'Weekdays + weekends' }

function Step({ done, label }: { done: boolean; label: string }): React.ReactElement {
  return (
    <span className={cn('inline-flex items-center gap-1 text-[11px] font-semibold', done ? 'text-[#2ECC71]' : 'text-[#F0B27A]')}>
      {done ? <Check className="size-3" aria-hidden="true" /> : <Minus className="size-3" aria-hidden="true" />}
      {label}
      <span className="sr-only">{done ? ' complete' : ' incomplete'}</span>
    </span>
  )
}

export default async function AdminApplicantsPage({
  searchParams,
}: {
  searchParams: { status?: string }
}): Promise<React.ReactElement> {
  const status = (APPLICANT_STATUS_FILTERS as readonly string[]).includes(searchParams.status ?? '')
    ? (searchParams.status as ApplicantStatusFilter)
    : 'pending'
  const { applicants, counts } = await listApplicants(status)
  const now = new Date()

  return (
    <>
      <AdminTopbar title="Sweeper Applicants" subtitle={`${counts.pending} awaiting review`} />
      <main className="flex-1 space-y-4 overflow-y-auto px-4 py-6 sm:px-7">
        <nav className="flex w-fit rounded-lg border border-white/[0.07] bg-white/[0.04] p-0.5" aria-label="Applicant status">
          {APPLICANT_STATUS_FILTERS.map((s) => (
            <Link
              key={s}
              href={s === 'pending' ? '/admin/sweepers' : `/admin/sweepers?status=${s}`}
              aria-current={status === s ? 'page' : undefined}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
                status === s ? 'bg-sky/20 text-sky-light' : 'text-[#9A9A9F] hover:text-white'
              )}
            >
              {TAB_LABEL[s]} <span className="text-[#8A8A8F]">{counts[s]}</span>
            </Link>
          ))}
        </nav>

        <section className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#1C1C1F]">
          {applicants.length === 0 ? (
            <EmptyState>
              {status === 'pending'
                ? 'No applications waiting. Share stormsweep.com/sweepers/apply to recruit Sweepers.'
                : `No ${TAB_LABEL[status].toLowerCase()} applicants.`}
            </EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-white/[0.07] text-[10px] font-bold uppercase tracking-[0.2em] text-[#8A8A8F]">
                    <th className="px-[18px] py-3 font-bold">Applicant</th>
                    <th className="px-3 py-3 font-bold">Availability</th>
                    <th className="px-3 py-3 font-bold">Progress</th>
                    <th className="px-3 py-3 font-bold">Applied</th>
                    <th className="px-[18px] py-3 text-right font-bold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {applicants.map((a) => (
                    <tr key={a.id} className="border-b border-white/[0.07] last:border-b-0 hover:bg-white/[0.02]">
                      <td className="px-[18px] py-3">
                        <Link href={`/admin/sweepers/${a.id}`} className="group block">
                          <span className="text-[13px] font-semibold text-[#F0F0F0] group-hover:text-sky-light group-hover:underline">{a.full_name}</span>
                          <span className="block text-[11px] text-[#8A8A8F]">{a.email} · {a.phone}</span>
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-xs text-[#9A9A9F]">
                        {AVAILABILITY[a.availability] ?? a.availability}
                        {a.has_vehicle ? '' : <span className="block text-[#F0B27A]">No vehicle</span>}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-col gap-0.5">
                          <Step done={a.all_tools_verified} label={`Tools ${a.toolsUploaded}/${a.toolsRequired}`} />
                          <Step done={a.agreement_signed} label="IC agreement" />
                        </div>
                      </td>
                      <td className="px-3 py-3 text-xs text-[#9A9A9F]">{formatRelative(a.applied_at, now)}</td>
                      <td className="px-[18px] py-3 text-right">
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide',
                            a.status === 'approved' && 'bg-[#27AE60]/15 text-[#2ECC71]',
                            a.status === 'rejected' && 'bg-white/[0.04] text-[#8A8A8F]',
                            a.status === 'pending' && (a.readyToApprove ? 'bg-sky/20 text-sky-light' : 'bg-[#E67E22]/15 text-[#F0B27A]')
                          )}
                        >
                          {a.status === 'pending' ? (a.readyToApprove ? 'Ready to review' : 'In progress') : a.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </>
  )
}
