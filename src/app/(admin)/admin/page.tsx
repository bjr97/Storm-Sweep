import { ActivityFeed } from '@/components/admin/ActivityFeed'
import { AdminTopbar } from '@/components/admin/AdminTopbar'
import { CrewStatus } from '@/components/admin/CrewStatus'
import { JobsTable } from '@/components/admin/JobsTable'
import { KpiRow } from '@/components/admin/KpiRow'
import { Panel } from '@/components/admin/Panel'
import { RevenueChart } from '@/components/admin/RevenueChart'
import { getDashboardData } from '@/lib/admin/dashboard'
import { formatBusinessDate } from '@/lib/admin/time'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Dashboard · Storm Sweep Admin' }

export default async function AdminDashboardPage(): Promise<React.ReactElement> {
  const now = new Date()
  const data = await getDashboardData(now)

  return (
    <>
      <AdminTopbar
        title="Dashboard"
        subtitle={formatBusinessDate(now, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
      />

      <main className="flex-1 space-y-4 overflow-y-auto px-4 py-6 sm:px-7">
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
