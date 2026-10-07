import { ChevronRight } from 'lucide-react'
import Link from 'next/link'

import { StatusBadge } from '@/components/customer/VisitSummary'
import { formatBusinessDate } from '@/lib/admin/time'
import { jobTimeLabel } from '@/lib/booking/timeWindows'
import { currentCustomerId, listCustomerVisits, type CustomerVisit } from '@/lib/customer/portal'
import { formatCurrency } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'My Visits · Storm Sweep' }

function Row({ v }: { v: CustomerVisit }): React.ReactElement {
  return (
    <li>
      <Link href={`/history/${v.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-black/[0.02]">
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            {v.scheduled_at ? formatBusinessDate(new Date(v.scheduled_at), { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'Date TBD'}
            <span className="font-normal text-[#6B6B70]"> · {jobTimeLabel(v.scheduled_at, v.time_window)}</span>
          </p>
          <p className="truncate text-sm text-[#6B6B70]">{v.service_type.join(' · ')}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <StatusBadge status={v.status} />
          <span className="text-xs text-[#6B6B70]">{formatCurrency(v.total_amount)}</span>
        </div>
        <ChevronRight className="size-4 shrink-0 text-black/30" aria-hidden="true" />
      </Link>
    </li>
  )
}

export default async function CustomerHistoryPage(): Promise<React.ReactElement> {
  const visits = await listCustomerVisits((await currentCustomerId())!)
  const upcoming = visits
    .filter((v) => v.status === 'pending' || v.status === 'confirmed' || v.status === 'in_progress')
    .sort((a, b) => (a.scheduled_at ?? '').localeCompare(b.scheduled_at ?? ''))
  const past = visits.filter((v) => v.status === 'complete' || v.status === 'cancelled')

  const list = 'divide-y divide-black/5 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm'
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <h1 className="font-[family-name:var(--font-bebas)] text-4xl tracking-wide">My visits</h1>
        <Link href="/book" className="inline-flex h-10 items-center rounded-lg bg-sky px-4 text-sm font-semibold text-white hover:bg-sky-dark">
          Book a visit
        </Link>
      </div>

      <section aria-labelledby="upcoming" className="space-y-2">
        <h2 id="upcoming" className="text-xs font-bold uppercase tracking-[0.18em] text-[#6B6B70]">Upcoming</h2>
        {upcoming.length ? <ul className={list}>{upcoming.map((v) => <Row key={v.id} v={v} />)}</ul> : <p className="text-sm text-[#6B6B70]">Nothing scheduled.</p>}
      </section>

      <section aria-labelledby="past" className="space-y-2">
        <h2 id="past" className="text-xs font-bold uppercase tracking-[0.18em] text-[#6B6B70]">Past</h2>
        {past.length ? <ul className={list}>{past.map((v) => <Row key={v.id} v={v} />)}</ul> : <p className="text-sm text-[#6B6B70]">Your completed visits will appear here.</p>}
      </section>
    </div>
  )
}
