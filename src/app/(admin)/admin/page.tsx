import { AlertTriangle } from 'lucide-react'
import Link from 'next/link'

import { ActivityFeed } from '@/components/admin/ActivityFeed'
import { AdminTopbar } from '@/components/admin/AdminTopbar'
import { CrewStatus } from '@/components/admin/CrewStatus'
import { HelpHandledButton } from '@/components/admin/HelpHandledButton'
import { JobsTable } from '@/components/admin/JobsTable'
import { KpiRow } from '@/components/admin/KpiRow'
import { Panel } from '@/components/admin/Panel'
import { RevenueChart } from '@/components/admin/RevenueChart'
import { getBalancesToCollect, getDashboardData, getLowRatingsToFollowUp, getOpenHelpRequests, getPausedJobs, getQuotesToPrice, getRecentInboundTexts, getRefundsDue } from '@/lib/admin/dashboard'
import { formatBusinessDate, formatRelative } from '@/lib/admin/time'
import { helpTopicLabel } from '@/lib/help'
import { ISSUE_KINDS } from '@/lib/sweepers/jobRun'
import { formatCurrency } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Dashboard · Storm Sweep Admin' }

export default async function AdminDashboardPage(): Promise<React.ReactElement> {
  const now = new Date()
  const [data, paused, refunds, texts, quotes, balances, help, lowRatings] = await Promise.all([
    getDashboardData(now),
    getPausedJobs(),
    getRefundsDue(),
    getRecentInboundTexts(),
    getQuotesToPrice(),
    getBalancesToCollect(),
    getOpenHelpRequests(),
    getLowRatingsToFollowUp(),
  ])

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
        {lowRatings.length > 0 ? (
          <section aria-label="Low ratings to follow up" className="space-y-2 rounded-xl border border-tornado/40 bg-tornado/10 p-4">
            <p className="flex flex-wrap items-center justify-between gap-2 text-sm font-bold text-[#F0F0F0]">
              {lowRatings.length} low rating{lowRatings.length === 1 ? '' : 's'} to follow up
              <Link href="/admin/reviews?filter=follow_up" className="text-xs font-semibold text-sky-light hover:underline">
                Open reviews
              </Link>
            </p>
            <ul className="space-y-1.5 text-[13px]">
              {lowRatings.map((r) => (
                <li key={r.jobId}>
                  <Link href={`/admin/jobs/${r.jobId}`} className="text-sky-light hover:underline">
                    {r.customerName} · {r.rating}★
                  </Link>
                  <span className="text-[#9A9A9F]"> · {formatRelative(r.createdAt, now)}</span>
                  {r.body ? <span className="block truncate text-[#C9C9CE]">“{r.body}”</span> : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {help.length > 0 ? (
          <section aria-label="Help requests" className="space-y-2 rounded-xl border border-sky/40 bg-sky/10 p-4">
            <p className="text-sm font-bold text-[#F0F0F0]">
              {help.length} customer{help.length === 1 ? '' : 's'} asked for help
            </p>
            <ul className="space-y-3 text-[13px]">
              {help.map((h) => (
                <li key={h.id} className="space-y-1">
                  <p className="flex flex-wrap items-center gap-x-2">
                    <Link href={`/admin/customers/${h.customerId}`} className="font-semibold text-sky-light hover:underline">
                      {h.customerName}
                    </Link>
                    <span className="text-[#9A9A9F]">· {helpTopicLabel(h.topic)} · {formatRelative(h.createdAt, now)}</span>
                    {h.phone ? (
                      <a href={`tel:${h.phone.replace(/[^\d+]/g, '')}`} className="text-sky-light hover:underline">
                        {h.phone}
                      </a>
                    ) : null}
                    {h.jobId ? (
                      <Link href={`/admin/jobs/${h.jobId}`} className="text-sky-light hover:underline">
                        Open visit
                      </Link>
                    ) : null}
                    <span className="ml-auto">
                      <HelpHandledButton id={h.id} />
                    </span>
                  </p>
                  <p className="whitespace-pre-line text-[#C9C9CE]">{h.message}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {balances.length > 0 ? (
          <section aria-label="Balances to collect" className="space-y-2 rounded-xl border border-wheat/50 bg-wheat/10 p-4">
            <p className="text-sm font-bold text-[#F0F0F0]">
              {formatCurrency(balances.reduce((n, b) => n + b.due, 0))} to collect from {balances.length} completed visit{balances.length === 1 ? '' : 's'}
            </p>
            <ul className="space-y-1 text-[13px]">
              {balances.map((b) => (
                <li key={b.jobId}>
                  <Link href={`/admin/jobs/${b.jobId}`} className="text-sky-light hover:underline">
                    {b.customerName} · {formatCurrency(b.due)}
                  </Link>
                  {b.completedAt ? <span className="text-[#9A9A9F]"> · done {formatRelative(b.completedAt, now)}</span> : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {quotes.length > 0 ? (
          <section aria-label="Quotes to price" className="space-y-2 rounded-xl border border-sky/40 bg-sky/10 p-4">
            <p className="text-sm font-bold text-[#F0F0F0]">
              {quotes.length} X-Large quote{quotes.length === 1 ? '' : 's'} waiting for a price
            </p>
            <ul className="space-y-1 text-[13px]">
              {quotes.map((q) => (
                <li key={q.jobId}>
                  <Link href={`/admin/jobs/${q.jobId}`} className="text-sky-light hover:underline">
                    {q.customerName}
                    {q.requestedFor ? ` · wants ${formatBusinessDate(new Date(q.requestedFor), { month: 'short', day: 'numeric' })}` : ''}
                  </Link>
                  <span className="text-[#9A9A9F]"> · requested {formatRelative(q.createdAt, now)}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {refunds.length > 0 ? (
          <section aria-label="Refunds due" className="space-y-2 rounded-xl border border-wheat/50 bg-wheat/10 p-4">
            <p className="text-sm font-bold text-[#F0F0F0]">
              {refunds.length} cancelled visit{refunds.length === 1 ? '' : 's'} need{refunds.length === 1 ? 's' : ''} a refund
            </p>
            <ul className="space-y-1 text-[13px]">
              {refunds.map((r) => (
                <li key={r.jobId}>
                  <Link href={`/admin/jobs/${r.jobId}`} className="text-sky-light hover:underline">
                    {r.customerName} · {formatCurrency(r.amount)}
                  </Link>
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
          {texts.length > 0 ? (
            <Panel title="Customer texts" subtitle="Replies to your Storm Sweep number" className="xl:col-span-3">
              <ul className="divide-y divide-white/[0.07]">
                {texts.map((t) => (
                  <li key={t.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2 text-[13px]">
                    <span className="font-semibold text-[#F0F0F0]">{t.name ?? t.from}</span>
                    {t.keyword === 'stop' ? <span className="text-[11px] font-bold uppercase text-[#F0B27A]">Opted out</span> : null}
                    {t.keyword === 'start' ? <span className="text-[11px] font-bold uppercase text-[#2ECC71]">Opted in</span> : null}
                    <span className="min-w-0 flex-1 text-[#C9C9CE]">“{t.body}”</span>
                    <span className="text-[11px] text-[#8A8A8F]">{formatRelative(t.at, now)}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}
        </div>
      </main>
    </>
  )
}
