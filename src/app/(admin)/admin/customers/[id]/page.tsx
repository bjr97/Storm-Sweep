import { ArrowLeft, Mail, Phone, Star } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { AdminTopbar } from '@/components/admin/AdminTopbar'
import { EmptyState, Panel } from '@/components/admin/Panel'
import { StatusPill } from '@/components/admin/StatusPill'
import { getCustomerDetail } from '@/lib/admin/customers'
import { formatBusinessDate } from '@/lib/admin/time'
import { jobTimeLabel } from '@/lib/booking/timeWindows'
import { formatCurrency, PRICING } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Customer · Storm Sweep Admin' }

function Row({ label, children }: { label: string; children: React.ReactNode }): React.ReactElement {
  return (
    <div className="flex justify-between gap-4 border-b border-white/[0.07] py-2 text-[13px] last:border-b-0">
      <dt className="shrink-0 text-[#8A8A8F]">{label}</dt>
      <dd className="min-w-0 text-right text-[#F0F0F0]">{children}</dd>
    </div>
  )
}

const date = (iso: string | null): string => (iso ? formatBusinessDate(new Date(iso), { month: 'short', day: 'numeric', year: 'numeric' }) : '—')

export default async function AdminCustomerPage({ params }: { params: { id: string } }): Promise<React.ReactElement> {
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) notFound()
  const detail = await getCustomerDetail(params.id)
  if (!detail) notFound()
  const { profile: p, email, jobs, reviews, friendsReferred } = detail
  const spend = jobs.filter((j) => j.status !== 'cancelled').reduce((n, j) => n + j.total_amount, 0)
  const isMember = p.membership_status === 'active'

  return (
    <>
      <AdminTopbar title={p.full_name ?? 'Customer'} subtitle={`Customer since ${date(p.created_at)} · ${formatCurrency(spend)} lifetime`} />
      <main className="flex-1 space-y-4 overflow-y-auto px-4 py-6 sm:px-7">
        <Link href="/admin/customers" className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-light hover:underline">
          <ArrowLeft className="size-3.5" aria-hidden="true" /> All customers
        </Link>

        <div className="grid gap-4 xl:grid-cols-3">
          <div className="space-y-4 xl:col-span-2">
            <Panel title="Visits" subtitle={`${jobs.length} total`} bodyClassName="p-0">
              {jobs.length === 0 ? (
                <EmptyState>No visits booked yet.</EmptyState>
              ) : (
                <ul className="divide-y divide-white/[0.07]">
                  {jobs.map((j) => (
                    <li key={j.id}>
                      <Link href={`/admin/jobs/${j.id}`} className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-white/[0.02]">
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-semibold text-[#F0F0F0]">
                            {date(j.scheduled_at)} <span className="font-normal text-[#8A8A8F]">· {jobTimeLabel(j.scheduled_at, j.time_window)}</span>
                          </p>
                          <p className="truncate text-[11px] text-[#9A9A9F]">
                            {j.service_type.join(' + ')}
                            {j.membership_visit ? ' · member visit' : ''}
                          </p>
                        </div>
                        <span className="text-[13px] text-[#F0F0F0]">{formatCurrency(j.total_amount)}</span>
                        <StatusPill status={j.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Reviews">
              {reviews.length === 0 ? (
                <EmptyState>No reviews yet.</EmptyState>
              ) : (
                <ul className="space-y-3">
                  {reviews.map((r) => (
                    <li key={r.job_id} className="text-[13px]">
                      <p className="flex items-center gap-2">
                        <span className="flex" aria-label={`${r.rating} out of 5 stars`}>
                          {[1, 2, 3, 4, 5].map((n) => (
                            <Star key={n} className={n <= r.rating ? 'size-3.5 fill-wheat-light text-wheat-light' : 'size-3.5 text-white/15'} aria-hidden="true" />
                          ))}
                        </span>
                        <span className="text-[11px] text-[#8A8A8F]">{date(r.created_at)}</span>
                        <Link href={`/admin/jobs/${r.job_id}`} className="text-[11px] text-sky-light hover:underline">visit</Link>
                      </p>
                      {r.body ? <p className="mt-1 text-[#C9C9CE]">“{r.body}”</p> : null}
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          <div className="space-y-4">
            <Panel title="Contact">
              <div className="space-y-1.5 text-[13px]">
                {p.phone ? (
                  <a href={`tel:${p.phone}`} className="flex items-center gap-2 text-sky-light hover:underline">
                    <Phone className="size-3.5" aria-hidden="true" /> {p.phone}
                  </a>
                ) : null}
                {email ? (
                  <a href={`mailto:${email}`} className="flex items-center gap-2 break-all text-sky-light hover:underline">
                    <Mail className="size-3.5 shrink-0" aria-hidden="true" /> {email}
                  </a>
                ) : null}
                {p.address ? <p className="text-[#C9C9CE]">{p.address}</p> : null}
              </div>
            </Panel>

            <Panel title="Storm Ready">
              <dl>
                <Row label="Status">{isMember ? <span className="font-semibold text-wheat-light">Active member</span> : p.membership_status === 'none' ? 'Not a member' : p.membership_status}</Row>
                {isMember ? (
                  <>
                    <Row label="Plan">{p.membership_plan === 'monthly' ? 'Monthly' : 'Annual'}</Row>
                    <Row label="Included visits">{p.visits_used} of {PRICING.membership.visits_per_year} used</Row>
                    <Row label="Renews">{date(p.membership_renews_at)}</Row>
                    {p.membership_commitment_ends_at ? <Row label="Commitment ends">{date(p.membership_commitment_ends_at)}</Row> : null}
                  </>
                ) : null}
              </dl>
            </Panel>

            <Panel title="Preferences">
              <dl>
                <Row label="Text messages">
                  {p.sms_opt_out ? (
                    <span className="text-[#F0B27A]">Opted out{p.sms_opt_out_at ? ` ${date(p.sms_opt_out_at)}` : ''}</span>
                  ) : (
                    'On'
                  )}
                </Row>
                <Row label="Marketing photos">
                  {p.marketing_photo_consent ? <span className="text-[#2ECC71]">Opted in</span> : 'Not allowed'}
                </Row>
                <Row label="First heard via">{jobs.at(-1)?.referral_source ?? '—'}</Row>
                <Row label="Invite code">{p.referral_code ?? '—'}</Row>
                <Row label="Friends referred">{friendsReferred}</Row>
                <Row label="Referral credit">{formatCurrency(p.referral_credit)}</Row>
              </dl>
            </Panel>
          </div>
        </div>
      </main>
    </>
  )
}
