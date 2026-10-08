import Link from 'next/link'

import { HelpForm } from '@/components/customer/HelpForm'
import { formatBusinessDate } from '@/lib/admin/time'
import { jobTimeLabel } from '@/lib/booking/timeWindows'
import { currentCustomerId } from '@/lib/customer/portal'
import { CHANGE_CUTOFF_HOURS } from '@/lib/customer/rules'
import { helpTopicLabel } from '@/lib/help'
import { SITE } from '@/lib/site'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Help · Storm Sweep' }

export default async function CustomerHelpPage({ searchParams }: { searchParams: { job?: string } }): Promise<React.ReactElement> {
  const customerId = (await currentCustomerId())!
  const supabase = createServiceClient()
  const [{ data: jobs }, { data: requests }] = await Promise.all([
    supabase
      .from('jobs')
      .select('id, scheduled_at, time_window, service_type, status')
      .eq('customer_id', customerId)
      .order('scheduled_at', { ascending: false })
      .limit(12),
    supabase
      .from('help_requests')
      .select('id, topic, message, handled_at, created_at')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(5),
  ])
  const visits = (jobs ?? []).map((j) => ({
    id: j.id,
    label: `${j.scheduled_at ? jobTimeLabel(j.scheduled_at, j.time_window) : 'Date to be set'} · ${j.service_type.join(' + ')}${j.status === 'cancelled' ? ' (cancelled)' : ''}`,
  }))
  const card = 'rounded-2xl border border-black/10 bg-white p-5 shadow-sm'
  const h2 = 'mb-3 font-[family-name:var(--font-bebas)] text-2xl tracking-wide'
  const link = 'font-semibold text-sky-dark underline'

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-[family-name:var(--font-bebas)] text-4xl tracking-wide">Need help?</h1>
        <p className="text-sm text-[#6B6B70]">
          Send us a message and we&apos;ll reply by text or email. You can also reply to any text from us
          {SITE.supportPhone ? (
            <>
              {' '}or call{' '}
              <a href={`tel:${SITE.supportPhone.replace(/[^\d+]/g, '')}`} className={link}>
                {SITE.supportPhone}
              </a>
            </>
          ) : null}
          .
        </p>
      </div>

      <section className={card} aria-labelledby="ask">
        <h2 id="ask" className={h2}>
          Message us
        </h2>
        <HelpForm visits={visits} initialJobId={searchParams.job ?? null} />
      </section>

      <section className={card} aria-labelledby="quick">
        <h2 id="quick" className={h2}>
          Quick answers
        </h2>
        <ul className="space-y-1.5 text-sm">
          <li>
            Reschedule or cancel: open the visit under{' '}
            <Link href="/history" className={link}>
              Visits
            </Link>{' '}
            (online until {CHANGE_CUTOFF_HOURS} hours before).
          </li>
          <li>
            Photo sharing and texts:{' '}
            <Link href="/account" className={link}>
              Account
            </Link>
            .
          </li>
          <li>
            Everything else:{' '}
            <Link href="/faq" className={link}>
              FAQ
            </Link>
            .
          </li>
        </ul>
      </section>

      {requests && requests.length > 0 ? (
        <section className={card} aria-labelledby="past">
          <h2 id="past" className={h2}>
            Your recent messages
          </h2>
          <ul className="divide-y divide-black/5 text-sm">
            {requests.map((r) => (
              <li key={r.id} className="py-2">
                <p className="flex flex-wrap gap-x-2 text-xs text-[#6B6B70]">
                  <span>{formatBusinessDate(new Date(r.created_at), { month: 'short', day: 'numeric' })}</span>
                  <span>· {helpTopicLabel(r.topic)}</span>
                  <span className={r.handled_at ? 'font-semibold text-[#1E7D46]' : 'font-semibold text-sky-dark'}>
                    · {r.handled_at ? 'Answered' : 'Waiting for us'}
                  </span>
                </p>
                <p className="line-clamp-2 text-shelter">{r.message}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
