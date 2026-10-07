import { ArrowLeft, CheckCircle2, PenLine, Star } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { ReviewForm } from '@/components/customer/ReviewForm'
import { VisitChanger } from '@/components/customer/VisitChanger'
import { VisitProgress } from '@/components/customer/VisitProgress'
import { StatusBadge, VisitFacts } from '@/components/customer/VisitSummary'
import { formatBusinessDate, formatBusinessTime } from '@/lib/admin/time'
import { currentCustomerId, getVisitReport, type ReportMedia } from '@/lib/customer/portal'
import { visitSteps } from '@/lib/customer/rules'
import { ISSUE_KINDS, PHASE_LABEL } from '@/lib/sweepers/jobRun'
import { formatCurrency } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Visit Report · Storm Sweep' }

const card = 'rounded-2xl border border-black/10 bg-white p-5 shadow-sm'
const h2 = 'font-[family-name:var(--font-bebas)] text-2xl tracking-wide text-shelter'

function Photo({ m, label }: { m: ReportMedia; label: string }): React.ReactElement | null {
  if (!m.url) return null
  return (
    <figure className="overflow-hidden rounded-xl bg-black/5">
      <a href={m.url} target="_blank" rel="noreferrer">
        {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URL */}
        <img src={m.url} alt={`${label} photo`} className="aspect-[4/3] w-full object-cover" />
      </a>
      <figcaption className="px-2 py-1 text-xs font-semibold text-[#4A4A50]">{label}</figcaption>
    </figure>
  )
}

export default async function VisitReportPage({ params }: { params: { id: string } }): Promise<React.ReactElement> {
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) notFound()
  const report = await getVisitReport((await currentCustomerId())!, params.id)
  if (!report) notFound()
  const { visit, job, media, checklist, installs, upgrades, findings, review } = report

  const before = media.filter((m) => m.kind === 'before')
  const after = media.filter((m) => m.kind === 'after')
  const inspection = media.filter((m) => m.kind === 'inspection')
  const videos = media.filter((m) => m.kind === 'video_before' || m.kind === 'video_after')
  const isUpcoming = visit.status === 'pending' || visit.status === 'confirmed' || visit.status === 'in_progress'
  const paid = job.payment_status === 'paid' ? job.total_amount : job.payment_status === 'deposit_paid' || job.payment_status === 'refunded' ? job.deposit_amount ?? 0 : 0
  const balance = Math.max(0, job.total_amount - paid)

  return (
    <div className="space-y-5">
      <Link href="/history" className="inline-flex items-center gap-1.5 text-sm font-semibold text-sky-dark hover:underline">
        <ArrowLeft className="size-4" aria-hidden="true" /> My visits
      </Link>

      <section className={card}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h1 className="font-[family-name:var(--font-bebas)] text-3xl tracking-wide">
            {visit.status === 'complete' ? 'Service report' : 'Visit details'}
          </h1>
          <StatusBadge status={visit.status} />
        </div>
        <div className="space-y-4">
          {visit.status !== 'cancelled' ? <VisitProgress steps={visitSteps(job)} /> : null}
          <VisitFacts visit={visit} />
          {isUpcoming && visit.status !== 'in_progress' ? (
            <VisitChanger
              jobId={visit.id}
              canChange={visit.canChange}
              hasDeposit={job.payment_status === 'deposit_paid' || job.payment_status === 'paid'}
              isMemberVisit={job.membership_visit}
            />
          ) : null}
          {visit.status === 'cancelled' ? (
            <p className="text-sm text-[#6B6B70]">
              Cancelled{job.cancelled_at ? ` ${formatBusinessDate(new Date(job.cancelled_at), { month: 'long', day: 'numeric' })}` : ''}.
              {job.refund_due ? ' Your deposit refund is being processed.' : job.payment_status === 'refunded' ? ' Your deposit was refunded.' : ''}
            </p>
          ) : null}
        </div>
      </section>

      {before.length + after.length > 0 ? (
        <section className={card} aria-labelledby="photos">
          <h2 id="photos" className={h2}>Before &amp; after</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#6B6B70]">Before</p>
              <div className="grid gap-2">{before.map((m) => <Photo key={m.id} m={m} label="Before" />)}</div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#6B6B70]">After</p>
              <div className="grid gap-2">{after.map((m) => <Photo key={m.id} m={m} label="After" />)}</div>
            </div>
          </div>
          {videos.length > 0 ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {videos.map((v) =>
                v.url ? (
                  <figure key={v.id}>
                    <video src={v.url} controls preload="metadata" className="aspect-video w-full rounded-xl bg-black" />
                    <figcaption className="mt-1 text-xs font-semibold text-[#4A4A50]">{v.kind === 'video_before' ? 'Before' : 'After'} walkthrough</figcaption>
                  </figure>
                ) : null
              )}
            </div>
          ) : null}
        </section>
      ) : null}

      {visit.status === 'complete' ? (
        <section className={card} aria-labelledby="work">
          <h2 id="work" className={h2}>What we did</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {checklist.map((c) => (
              <li key={c.phase} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="size-4 text-[#27AE60]" aria-hidden="true" />
                <span className="font-semibold">{PHASE_LABEL[c.phase]}</span>
                <span className="text-[#6B6B70]">— {c.done} of {c.total} steps</span>
              </li>
            ))}
            {installs.map((i) => (
              <li key={i.label} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className={i.done ? 'size-4 text-[#27AE60]' : 'size-4 text-black/20'} aria-hidden="true" />
                {i.label}
              </li>
            ))}
          </ul>
          {inspection.length > 0 ? (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#6B6B70]">Inspection photos</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{inspection.map((m) => <Photo key={m.id} m={m} label="Walls & structure" />)}</div>
            </div>
          ) : null}
          {findings.length > 0 ? (
            <div className="mt-4 space-y-1 rounded-xl bg-[#E67E22]/10 p-3 text-sm text-[#7A4510]">
              <p className="font-semibold">Things your Sweeper flagged</p>
              {findings.map((f, idx) => (
                <p key={idx}>
                  {ISSUE_KINDS.find((k) => k.value === f.kind)?.label ?? f.kind}
                  {f.note ? ` — ${f.note}` : ''}. {f.outcome}.
                </p>
              ))}
            </div>
          ) : null}
          {job.customer_signed_at ? (
            <p className="mt-4 flex items-center gap-2 text-sm text-[#4A4A50]">
              <PenLine className="size-4" aria-hidden="true" />
              Signed off by {job.customer_signature_name} · {formatBusinessDate(new Date(job.customer_signed_at), { month: 'short', day: 'numeric' })} at {formatBusinessTime(job.customer_signed_at)}
            </p>
          ) : null}
        </section>
      ) : null}

      <section className={card} aria-labelledby="charges">
        <h2 id="charges" className={h2}>Charges</h2>
        <dl className="mt-2 space-y-1.5 text-sm">
          {upgrades.map((u) => (
            <div key={u.id} className="flex justify-between">
              <dt>{u.name} <span className="text-[#6B6B70]">(added on site)</span></dt>
              <dd>{formatCurrency(u.price)}</dd>
            </div>
          ))}
          <div className="flex justify-between font-semibold"><dt>Visit total</dt><dd>{formatCurrency(job.total_amount)}</dd></div>
          {job.membership_visit ? <p className="text-xs text-[#6B6B70]">Clean covered by your Storm Ready membership.</p> : null}
          <div className="flex justify-between text-[#4A4A50]"><dt>Paid</dt><dd>{formatCurrency(paid)}</dd></div>
          {visit.status !== 'cancelled' && balance > 0 ? (
            <div className="flex justify-between border-t border-black/10 pt-1.5 font-bold">
              <dt>{visit.status === 'complete' ? 'Balance due' : 'Due after your visit'}</dt>
              <dd>{formatCurrency(balance)}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      {visit.status === 'complete' ? (
        <section className={card} aria-labelledby="review">
          <h2 id="review" className={h2}>Your review</h2>
          <div className="mt-2">
            {review ? (
              <div className="space-y-1 text-sm">
                <p className="flex gap-0.5" aria-label={`${review.rating} out of 5 stars`}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} className={n <= review.rating ? 'size-5 fill-wheat text-wheat' : 'size-5 text-black/15'} aria-hidden="true" />
                  ))}
                </p>
                {review.body ? <p className="text-[#4A4A50]">“{review.body}”</p> : null}
              </div>
            ) : (
              <ReviewForm jobId={visit.id} sweeperFirstName={visit.sweeperFirstName} />
            )}
          </div>
        </section>
      ) : null}
    </div>
  )
}
