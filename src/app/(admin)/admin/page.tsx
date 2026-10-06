import { AlertTriangle } from 'lucide-react'
import Link from 'next/link'

import { ActivityFeed } from '@/components/admin/ActivityFeed'
import { AdminTopbar } from '@/components/admin/AdminTopbar'
import { CrewStatus } from '@/components/admin/CrewStatus'
import { JobsTable } from '@/components/admin/JobsTable'
import { KpiRow } from '@/components/admin/KpiRow'
import { Panel } from '@/components/admin/Panel'
import { RevenueChart } from '@/components/admin/RevenueChart'
import { getDashboardData, getPausedJobs } from '@/lib/admin/dashboard'
import { formatBusinessDate, formatRelative } from '@/lib/admin/time'
import { ISSUE_KINDS } from '@/lib/sweepers/jobRun'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Dashboard · Storm Sweep Admin' }

export default async function AdminDashboardPage(): Promise<React.ReactElement> {
  const now = new Date()
  const [data, paused] = await Promise.all([getDashboardData(now), getPausedJobs()])

  return (
    <>
      <AdminTopbar
        title="Dashboard"
        subtitle={formatBusinessDate(now, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
      />

      <main className="flex-1 space-y-4 overflow-y-auto px-4 py-6 sm:px-7">
        {paused.length > 0 ? (
          <section role="alert" aria-label="Paused jobs" className="space-y-2 rounded-xl border border-tornado/60 bg-tornado/15 p-4">
            <p className="flex items-center gap-2 text-sm font-bold text-[#F0F0F0]">
              <AlertTriangle className="size-4 text-[#F1948A]" aria-hidden="true" />
              {paused.length} job{paused.length === 1 ? '' : 's'} paused — a Sweeper is waiting on you
            </p>
            <ul className="space-y-1 text-[13px]">
              {paused.map((p) => (
                <li key={p.jobId + p.reportedAt}>
                  <Link href={`/admin/jobs/${p.jobId}`} className="text-sky-light hover:underline">
                    {ISSUE_KINDS.find((k) => k.value === p.kind)?.label ?? p.kind} · {p.address}
                  </Link>
                  <span className="text-[#9A9A9F]"> · {formatRelative(p.reportedAt, now)}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        <KpiRow kpis={data.kpis} />

        <div className="grid gap-4 xl:grid-cols-3">
          <Panel
            title="Today's jobs"
            subtitle={`${data.todaysJobs.length} scheduled`}
            className="xl:col-span-2"
            bodyClassName="py-2"
          >
            <JobsTable jobs={data.todaysJobs} />
          </Panel>
          <Panel title="Recent activity" bodyClassName="py-1">
            <ActivityFeed items={data.activity} now={now} />
          </Panel>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <Panel
            title="Visit revenue · last 8 weeks"
            subtitle="Paid bookings · memberships billed in Stripe"
            className="xl:col-span-2"
          >
            <RevenueChart weeks={data.revenueWeeks} />
          </Panel>
          <Panel title="Crew status" bodyClassName="py-1">
            <CrewStatus crew={data.crew} />
          </Panel>
        </div>
      </main>
    </>
  )
}
