import { AlertTriangle, ArrowLeft, Check, ExternalLink, Mail, Phone, Star } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { AdminTopbar } from '@/components/admin/AdminTopbar'
import { AssignSweeperSelect } from '@/components/admin/AssignSweeperSelect'
import { IssueDecision } from '@/components/admin/IssueDecision'
import { JobActions } from '@/components/admin/JobActions'
import { JobEditor } from '@/components/admin/JobEditor'
import { MarkRefundedButton } from '@/components/admin/MarkRefundedButton'
import { EmptyState, Panel } from '@/components/admin/Panel'
import { StatusPill } from '@/components/admin/StatusPill'
import { getJobDetail, listSweepers } from '@/lib/admin/jobs'
import { formatBusinessDate, formatBusinessTime, localDate } from '@/lib/admin/time'
import { jobTimeLabel } from '@/lib/booking/timeWindows'
import { ISSUE_KINDS, parseRecommendations, RECOMMENDATIONS } from '@/lib/sweepers/jobRun'
import { cn, formatCurrency, PRICING } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Job · Storm Sweep Admin' }

const PAYMENT_LABEL: Record<string, string> = {
  unpaid: 'Unpaid',
  deposit_paid: 'Deposit paid',
  paid: 'Paid in full',
  refunded: 'Refunded',
}

const PHOTO_TYPE_LABEL: Record<string, string> = {
  booking_screen: 'Booking photo',
  before: 'Before',
  after: 'After',
  upgrade: 'Upgrade',
  signature: 'Signature',
  inspection: 'Inspection',
  issue: 'Problem report',
  video_before: 'Before video',
  video_after: 'After video',
}

const PHASE_LABEL: Record<number, string> = { 1: 'Arrival', 2: 'Deep clean', 3: 'Inspect & install', 4: 'Wrap-up' }

function Row({ label, children }: { label: string; children: React.ReactNode }): React.ReactElement {
  return (
    <div className="flex justify-between gap-4 border-b border-white/[0.07] py-2 text-[13px] last:border-b-0">
      <dt className="shrink-0 text-[#8A8A8F]">{label}</dt>
      <dd className="min-w-0 text-right text-[#F0F0F0]">{children}</dd>
    </div>
  )
}

export default async function AdminJobDetailPage({
  params,
}: {
  params: { id: string }
}): Promise<React.ReactElement> {
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) notFound()
  const [detail, sweepers] = await Promise.all([getJobDetail(params.id), listSweepers()])
  if (!detail) notFound()

  const { job, customer, checklist, photos, issues, upgrades, blockers } = detail
  const openIssue = issues.find((i) => i.status === 'open')
  const recs = parseRecommendations(job.upgrade_flags)
  const locked = job.status === 'in_progress' || job.status === 'complete'
  const required = checklist.filter((c) => c.required)
  const doneCount = checklist.filter((c) => c.done).length
  const requiredDone = required.filter((c) => c.done).length
  const pct = checklist.length ? Math.round((doneCount / checklist.length) * 100) : 0
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.address)}`
  const balance = job.total_amount - (job.deposit_amount ?? 0)

  return (
    <>
      <AdminTopbar title={customer.name} subtitle={job.address}>
        <StatusPill status={job.status} />
      </AdminTopbar>

      <main className="flex-1 space-y-4 overflow-y-auto px-4 py-6 sm:px-7">
        <Link href="/admin/jobs" className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-light hover:underline">
          <ArrowLeft className="size-3.5" aria-hidden="true" /> All jobs
        </Link>

        {job.refund_due ? (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-wheat/50 bg-wheat/10 p-4 text-sm text-[#F0F0F0]">
            <p>
              <b>Refund due.</b> {job.cancelled_by === 'customer' ? 'The customer cancelled' : 'This visit was cancelled'}
              {job.cancelled_at ? ` on ${formatBusinessDate(new Date(job.cancelled_at), { month: 'short', day: 'numeric' })}` : ''} after paying{' '}
              {formatCurrency(job.deposit_amount ?? 0)}. Refund it in Stripe/PayPal, then mark it here.
            </p>
            <MarkRefundedButton jobId={job.id} />
          </div>
        ) : null}

        {openIssue ? (
          <div role="alert" className="flex gap-3 rounded-xl border border-tornado/60 bg-tornado/15 p-4 text-sm text-[#F0F0F0]">
            <AlertTriangle className="size-5 shrink-0 text-[#F1948A]" aria-hidden="true" />
            <div className="min-w-0 flex-1 space-y-3">
              <p>
                <b>Job paused.</b> {detail.sweeperName ?? 'The Sweeper'} reported{' '}
                <b>{ISSUE_KINDS.find((k) => k.value === openIssue.kind)?.label}</b>
                {openIssue.note ? ` — “${openIssue.note}”` : ''} at {formatBusinessTime(openIssue.created_at)}. They&apos;re waiting on you.
              </p>
              <IssueDecision jobId={job.id} issueId={openIssue.id} />
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-3">
          <div className="space-y-4 xl:col-span-2">
            {job.en_route_at || job.arrived_at || job.status === 'in_progress' || job.status === 'complete' ? (
              <Panel title="On site">
                <dl>
                  {job.en_route_at ? <Row label="On the way">{formatBusinessTime(job.en_route_at)}</Row> : null}
                  {job.arrived_at ? (
                    <Row label="Arrived">
                      {formatBusinessTime(job.arrived_at)} ·{' '}
                      {job.arrival_verified === true ? (
                        <span className="text-[#2ECC71]">GPS confirmed{job.arrival_distance_m !== null ? ` (${job.arrival_distance_m} m)` : ''}</span>
                      ) : job.arrival_verified === false ? (
                        <span className="text-[#F0B27A]">
                          {job.arrival_lat === null ? 'no location shared' : `GPS ${job.arrival_distance_m ?? '?'} m from address`}
                        </span>
                      ) : (
                        <span className="text-[#9A9A9F]">address couldn&apos;t be mapped</span>
                      )}
                      {job.arrival_lat !== null && job.arrival_lng !== null ? (
                        <>
                          {' · '}
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${job.arrival_lat},${job.arrival_lng}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sky-light hover:underline"
                          >
                            map
                          </a>
                        </>
                      ) : null}
                    </Row>
                  ) : null}
                  {job.customer_signed_at ? (
                    <Row label="Signed">
                      {job.customer_signature_name} · {formatBusinessTime(job.customer_signed_at)}
                    </Row>
                  ) : null}
                  {job.completed_at ? <Row label="Completed">{formatBusinessTime(job.completed_at)}</Row> : null}
                  {blockers.length > 0 ? <Row label="Still to do">{blockers.join(' · ')}</Row> : null}
                </dl>
              </Panel>
            ) : null}

            {RECOMMENDATIONS.some((r) => recs[r.key]) ? (
              <Panel title="Recommendations" subtitle="Upgrade opportunities the Sweeper logged — follow up">
                <dl>
                  {RECOMMENDATIONS.filter((r) => recs[r.key]).map((r) => (
                    <Row key={r.key} label={r.label}>{recs[r.key]?.note ?? '—'}</Row>
                  ))}
                </dl>
              </Panel>
            ) : null}
            {upgrades.length > 0 ? (
              <Panel title="Upgrades sold on site" subtitle="Added to the balance due">
                <dl>
                  {upgrades.map((u) => (
                    <Row key={u.id} label={u.name}>
                      {formatCurrency(u.price)}
                      {u.discount ? <span className="text-[#8A8A8F]"> (member {formatCurrency(u.discount)})</span> : null}
                      <span className="text-[#8A8A8F]"> · approved {u.customer_initials}</span>
                    </Row>
                  ))}
                </dl>
              </Panel>
            ) : null}

            {issues.filter((i) => i.status !== 'open').length > 0 ? (
              <Panel title="Problem reports">
                <dl>
                  {issues
                    .filter((i) => i.status !== 'open')
                    .map((i) => (
                      <Row key={i.id} label={ISSUE_KINDS.find((k) => k.value === i.kind)?.label ?? i.kind}>
                        {i.status === 'continue' ? 'Continued' : 'Visit ended'}
                        {i.resolution_note ? ` — ${i.resolution_note}` : ''}
                      </Row>
                    ))}
                </dl>
              </Panel>
            ) : null}

            <Panel title="Booking">
              <dl>
                <Row label="Scheduled">
                  {job.scheduled_at
                    ? `${formatBusinessDate(new Date(job.scheduled_at), { weekday: 'long', month: 'long', day: 'numeric' })} · ${jobTimeLabel(job.scheduled_at, job.time_window)}`
                    : <span className="text-[#F0B27A]">Not scheduled (quote)</span>}
                </Row>
                <Row label="Address">
                  <a href={mapsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sky-light hover:underline">
                    {job.address} <ExternalLink className="size-3" aria-hidden="true" />
                  </a>
                </Row>
                <Row label="Shelter size">{job.shelter_size}</Row>
                <Row label="Services">
                  <span className="flex flex-wrap justify-end gap-1">
                    {job.service_type.map((s) => (
                      <span key={s} className="rounded bg-sky/[0.12] px-1.5 py-0.5 text-[11px] font-semibold text-sky-light">{s}</span>
                    ))}
                  </span>
                </Row>
                <Row label="Customer notes">{job.notes ? <span className="whitespace-pre-wrap">{job.notes}</span> : '—'}</Row>
                <Row label="Heard about us">
                  {detail.partnerName ? `${detail.partnerName} (partner)` : job.referral_source ?? '—'}
                </Row>
                <Row label="Booked">{formatBusinessDate(new Date(job.created_at), { month: 'short', day: 'numeric', year: 'numeric' })}</Row>
              </dl>
            </Panel>

            <Panel title="Photos" subtitle={`${photos.length} total`}>
              {photos.length === 0 ? (
                <EmptyState>No photos yet. Before/after photos are added by the Sweeper on site.</EmptyState>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {photos.map((p) => (
                    <figure key={p.id} className="overflow-hidden rounded-lg border border-white/[0.07] bg-[#141416]">
                      {p.url && p.type.startsWith('video_') ? (
                        <video src={p.url} controls preload="metadata" className="aspect-[4/3] w-full bg-black object-cover" />
                      ) : p.url ? (
                        <a href={p.url} target="_blank" rel="noreferrer">
                          <Image src={p.url} alt={`${PHOTO_TYPE_LABEL[p.type] ?? p.type} photo`} width={320} height={240} unoptimized className="aspect-[4/3] w-full object-cover" />
                        </a>
                      ) : (
                        <div className="flex aspect-[4/3] items-center justify-center text-[11px] text-[#8A8A8F]">Unavailable</div>
                      )}
                      <figcaption className="flex items-center justify-between px-2 py-1.5 text-[11px] text-[#9A9A9F]">
                        {PHOTO_TYPE_LABEL[p.type] ?? p.type}
                        {p.consent ? <span className="text-[#2ECC71]">Marketing OK</span> : null}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="Checklist" subtitle={`${requiredDone}/${required.length} required · ${pct}% overall`}>
              <progress
                value={pct}
                max={100}
                aria-label="Checklist progress"
                className="mb-4 block h-1.5 w-full appearance-none overflow-hidden rounded-full bg-white/[0.08] [&::-moz-progress-bar]:bg-sky [&::-webkit-progress-bar]:bg-white/[0.08] [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-sky"
              />
              <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
                {[1, 2, 3, 4].map((phase) => (
                  <div key={phase}>
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#8A8A8F]">
                      Phase {phase} · {PHASE_LABEL[phase]}
                    </p>
                    <ul className="space-y-1">
                      {checklist.filter((c) => c.phase === phase).map((c) => (
                        <li key={c.id} className="flex items-start gap-2 text-xs">
                          <span className={cn('mt-0.5 flex size-3.5 shrink-0 items-center justify-center rounded-sm border', c.done ? 'border-[#27AE60] bg-[#27AE60]' : 'border-white/20')}>
                            {c.done ? <Check className="size-2.5 text-white" aria-hidden="true" /> : null}
                          </span>
                          <span className={c.done ? 'text-[#9A9A9F]' : 'text-[#F0F0F0]'}>
                            {c.label}
                            {c.required ? <span className="text-[#8A8A8F]"> · required</span> : null}
                            <span className="sr-only">{c.done ? ' (done)' : ' (not done)'}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          <div className="space-y-4">
            <Panel title="Actions">
              <div className="space-y-4">
                <div>
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#8A8A8F]">Sweeper</p>
                  <AssignSweeperSelect jobId={job.id} sweeperId={job.sweeper_id} sweepers={sweepers} locked={locked} />
                  {sweepers.length === 0 ? (
                    <p className="mt-1.5 text-[11px] text-[#8A8A8F]">Approve a Sweeper applicant to assign jobs.</p>
                  ) : null}
                </div>
                <JobActions jobId={job.id} status={job.status} photoGrade={job.photo_grade} photoApproved={job.photo_approved} />
                {job.status === 'pending' || job.status === 'confirmed' ? (
                  <JobEditor
                    jobId={job.id}
                    initial={{
                      date: job.scheduled_at
                        ? (() => {
                            const d = localDate(new Date(job.scheduled_at))
                            return `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`
                          })()
                        : '',
                      window: job.time_window ?? 'morning',
                      shelterSize: job.shelter_size,
                      services: job.service_type,
                      total: job.total_amount,
                      serviceValue: job.service_value ?? job.total_amount,
                      address: job.address,
                      notes: job.notes ?? '',
                      isQuote: job.shelter_size === 'xlarge' && job.total_amount === 0,
                      depositPaid: job.payment_status === 'deposit_paid' || job.payment_status === 'paid' ? job.deposit_amount ?? 0 : 0,
                    }}
                  />
                ) : null}
              </div>
            </Panel>

            <Panel title="Customer">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-[#F0F0F0]">
                {customer.name}
                {customer.isMember ? <Star className="size-3.5 fill-wheat-light text-wheat-light" aria-label="Storm Ready member" /> : null}
              </p>
              {customer.isMember ? (
                <p className="mt-0.5 text-[11px] text-wheat-light">
                  Storm Ready · {customer.visitsUsed} of {PRICING.membership.visits_per_year} visits used
                </p>
              ) : null}
              <div className="mt-3 space-y-1.5 text-[13px]">
                {customer.phone ? (
                  <a href={`tel:${customer.phone}`} className="flex items-center gap-2 text-sky-light hover:underline">
                    <Phone className="size-3.5" aria-hidden="true" /> {customer.phone}
                  </a>
                ) : null}
                {customer.email ? (
                  <a href={`mailto:${customer.email}`} className="flex items-center gap-2 break-all text-sky-light hover:underline">
                    <Mail className="size-3.5 shrink-0" aria-hidden="true" /> {customer.email}
                  </a>
                ) : null}
              </div>
            </Panel>

            <Panel title="Payment">
              <dl>
                <Row label="Visit total">{formatCurrency(job.total_amount)}</Row>
                <Row label="Deposit">{formatCurrency(job.deposit_amount ?? 0)}</Row>
                <Row label="Balance after service">{formatCurrency(Math.max(0, balance))}</Row>
                <Row label="Status">{PAYMENT_LABEL[job.payment_status] ?? job.payment_status}</Row>
                <Row label="List value (sweeper pay basis)">{formatCurrency(job.service_value ?? job.total_amount)}</Row>
                {job.membership_visit ? <Row label="Membership">Clean covered by Storm Ready</Row> : null}
                <Row label="Paid via">{job.paypal_order_id ? 'PayPal' : job.stripe_payment_intent_id ? 'Stripe' : '—'}</Row>
              </dl>
            </Panel>

            <Panel title="Photo screening">
              {job.photo_grade ? (
                <dl>
                  <Row label="AI grade">
                    <span className={job.photo_approved ? '' : 'font-semibold text-[#F0B27A]'}>{job.photo_grade}</span>
                  </Row>
                  <Row label="Reviewed">
                    {job.admin_reviewed_at
                      ? formatBusinessDate(new Date(job.admin_reviewed_at), { month: 'short', day: 'numeric' })
                      : job.photo_approved ? 'Auto-approved' : <span className="text-[#F0B27A]">Needs review</span>}
                  </Row>
                  <Row label="Flags">{job.photo_flags.length ? job.photo_flags.join(', ').replace(/_/g, ' ') : 'None'}</Row>
                  {job.photo_admin_note ? <Row label="AI note">{job.photo_admin_note}</Row> : null}
                </dl>
              ) : (
                <EmptyState>No shelter photo was uploaded at booking.</EmptyState>
              )}
            </Panel>
          </div>
        </div>
      </main>
    </>
  )
}
