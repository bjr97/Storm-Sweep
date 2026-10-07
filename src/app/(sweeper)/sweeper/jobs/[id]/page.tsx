import { AlertTriangle, ArrowLeft, CalendarDays, CheckCircle2, Clock, MapPin, PenLine } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { BoardAutoRefresh } from '@/components/sweeper/BoardAutoRefresh'
import { ArrivalActions } from '@/components/sweeper/run/ArrivalActions'
import { ChecklistPanel, type ChecklistRow } from '@/components/sweeper/run/ChecklistPanel'
import { CompleteButton } from '@/components/sweeper/run/CompleteButton'
import { IssueReporter } from '@/components/sweeper/run/IssueReporter'
import { PhotoButton } from '@/components/sweeper/run/PhotoButton'
import { SignaturePad } from '@/components/sweeper/run/SignaturePad'
import { RecommendationFlags } from '@/components/sweeper/run/RecommendationFlags'
import { UpgradeSeller, type UpgradeOption } from '@/components/sweeper/run/UpgradeSeller'
import { formatBusinessDate, formatBusinessTime } from '@/lib/admin/time'
import { jobTimeLabel } from '@/lib/booking/timeWindows'
import { calculateSweeperPay, lockedPct } from '@/lib/sweepers/jobBoard'
import {
  buildChecklist,
  isItemDone,
  ISSUE_KINDS,
  isManualItem,
  MAX_VIDEO_SECONDS,
  MIN_PHOTOS,
  parseRecommendations,
  PHOTO_ITEM_TYPE,
  SELLABLE_UPGRADE_IDS,
  upgradeName,
  upgradeQuote,
} from '@/lib/sweepers/jobRun'
import { loadRunJob } from '@/lib/sweepers/jobRunServer'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency, PRICING } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Job · Storm Sweep' }

const SIZE_LABEL: Record<string, string> = { small: 'Small', standard: 'Standard', large: 'Large', xlarge: 'X-Large' }

function Card({ title, children, subtitle }: { title: string; subtitle?: string; children: React.ReactNode }): React.ReactElement {
  return (
    <section className="space-y-3 rounded-xl border border-white/[0.07] bg-[#1C1C1F] p-4">
      <header>
        <h2 className="font-[family-name:var(--font-bebas)] text-2xl tracking-wide text-white">{title}</h2>
        {subtitle ? <p className="text-xs text-[#9A9A9F]">{subtitle}</p> : null}
      </header>
      {children}
    </section>
  )
}

export default async function SweeperJobPage({ params }: { params: { id: string } }): Promise<React.ReactElement> {
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) notFound()
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const run = user ? await loadRunJob(user.id, params.id) : null
  if (!run) notFound()

  const { job, state, media, issues, upgrades, blockers, isMember, customerFirstName } = run
  const openIssue = issues.find((i) => i.status === 'open')
  const inProgress = job.status === 'in_progress'
  const locked = !inProgress || Boolean(openIssue)

  const rows: ChecklistRow[] = buildChecklist(job.service_type).map((item) => {
    const photo = PHOTO_ITEM_TYPE[item.id] ? media.find((m) => m.checklistItem === item.id) : undefined
    return {
      id: item.id,
      phase: item.phase,
      label: item.label,
      required: item.required,
      done: isItemDone(item, state),
      mode: PHOTO_ITEM_TYPE[item.id] ? 'photo' : isManualItem(item.id) ? 'manual' : 'auto',
      thumbUrl: photo?.url ?? null,
    }
  })

  const upgradeOptions: UpgradeOption[] = SELLABLE_UPGRADE_IDS.flatMap((id) => {
    const name = upgradeName(id)
    const booked =
      job.service_type.some((s) => s.startsWith(name)) ||
      (id === 'led_package' && job.service_type.some((s) => s.startsWith('Full Package')))
    const quote = upgradeQuote(id, job.shelter_size, isMember)
    return booked || !quote ? [] : [{ id, name, ...quote }]
  })

  const pct = lockedPct(job)
  const hasVideos = media.some((m) => m.kind === 'video_before') && media.some((m) => m.kind === 'video_after')
  const pay = calculateSweeperPay({
    serviceValue: job.service_value ?? job.total_amount,
    pct,
    scheduledAt: job.scheduled_at ? new Date(job.scheduled_at) : null,
    completedAt: job.completed_at ? new Date(job.completed_at) : new Date(),
    upgradesSold: upgrades.length,
    videoBonus: hasVideos,
  })

  const extraPhotos = media.filter((m) => (m.kind === 'before' || m.kind === 'after') && !m.checklistItem)

  return (
    <main className="space-y-4 px-4 pb-20 pt-4">
      <Link href="/sweeper" className="inline-flex items-center gap-1.5 text-sm font-semibold text-sky-light hover:underline">
        <ArrowLeft className="size-4" aria-hidden="true" /> Job board
      </Link>

      {/* Job header */}
      <section className="space-y-2 rounded-xl border border-sky/25 bg-[#1C1C1F] p-4">
        <p className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-[#F0F0F0]">
          <span className="inline-flex items-center gap-1.5 font-semibold">
            <CalendarDays className="size-4 text-sky-light" aria-hidden="true" />
            {job.scheduled_at ? formatBusinessDate(new Date(job.scheduled_at), { weekday: 'short', month: 'short', day: 'numeric' }) : 'Date TBD'}
          </span>
          <span className="inline-flex items-center gap-1.5 text-[#C9C9CE]">
            <Clock className="size-4 text-sky-light" aria-hidden="true" />
            {jobTimeLabel(job.scheduled_at, job.time_window)}
          </span>
        </p>
        <a
          href={`https://maps.google.com/?q=${encodeURIComponent(job.address)}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-start gap-1.5 text-base font-semibold text-sky-light hover:underline"
        >
          <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {job.address}
        </a>
        <p className="text-sm text-[#C9C9CE]">
          {customerFirstName}
          {isMember ? ' · Storm Ready member' : ''} · {SIZE_LABEL[job.shelter_size]} shelter
        </p>
        <p className="text-sm text-[#F0F0F0]">{job.service_type.join(' + ')}</p>
        {job.notes ? <p className="whitespace-pre-wrap rounded-md bg-white/[0.04] p-2 text-xs text-[#C9C9CE]">{job.notes}</p> : null}
      </section>

      {openIssue ? <BoardAutoRefresh everyMs={30_000} /> : null}
      {openIssue ? (
        <div role="status" className="flex gap-3 rounded-xl border border-tornado/60 bg-tornado/15 p-4 text-sm text-[#F0F0F0]">
          <AlertTriangle className="size-5 shrink-0 text-[#F1948A]" aria-hidden="true" />
          <div>
            <p className="font-bold">Job paused — waiting on the office</p>
            <p className="text-[#C9C9CE]">
              You reported: {ISSUE_KINDS.find((k) => k.value === openIssue.kind)?.label}
              {openIssue.note ? ` — ${openIssue.note}` : ''}. Don&apos;t continue until the office gives the OK. This page updates when they decide.
            </p>
          </div>
        </div>
      ) : null}
      {issues
        .filter((i) => i.status !== 'open' && i.resolution_note)
        .slice(0, 1)
        .map((i) => (
          <p key={i.id} className="rounded-lg bg-white/[0.04] p-3 text-xs text-[#C9C9CE]">
            Office: {i.resolution_note}
          </p>
        ))}

      {job.status === 'confirmed' ? (
        <Card title="Get there" subtitle="Tap “On my way” when you leave so the customer gets a heads-up.">
          <ArrivalActions jobId={job.id} enRoute={Boolean(job.en_route_at)} />
          <IssueReporter jobId={job.id} disabled={Boolean(openIssue)} />
        </Card>
      ) : null}

      {job.status === 'cancelled' ? (
        <p className="rounded-xl border border-white/[0.1] p-4 text-center text-sm text-[#C9C9CE]">This visit was ended by the office. Nothing more to do here.</p>
      ) : null}

      {inProgress || job.status === 'complete' ? (
        <>
          {inProgress ? (
            <p className="text-xs text-[#9A9A9F]">
              Arrived {job.arrived_at ? formatBusinessTime(job.arrived_at) : ''}
              {job.arrival_verified === true ? ' · location confirmed' : job.arrival_verified === false ? ' · location not confirmed (office will review)' : ''}
            </p>
          ) : null}

          <Card title="Checklist" subtitle={`Photos: before ${state.photoCounts.before}/${MIN_PHOTOS.before} · after ${state.photoCounts.after}/${MIN_PHOTOS.after}`}>
            <ChecklistPanel jobId={job.id} rows={rows} locked={locked} />
            {inProgress ? (
              <div className="flex flex-wrap gap-2 border-t border-white/[0.07] pt-3">
                <PhotoButton jobId={job.id} kind="before" label="Extra before photo" disabled={locked} done />
                <PhotoButton jobId={job.id} kind="after" label="Extra after photo" disabled={locked} done />
              </div>
            ) : null}
            {extraPhotos.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {extraPhotos.map((m) =>
                  m.url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- signed storage URL
                    <img key={m.id} src={m.url} alt={`${m.kind} photo`} className="size-14 rounded-md object-cover" />
                  ) : null
                )}
              </div>
            ) : null}
          </Card>

          <Card title="Videos" subtitle={`Optional · under ${MAX_VIDEO_SECONDS} sec each · both earn +${formatCurrency(PRICING.sweeper.video_bonus)}`}>
            <div className="flex flex-wrap gap-2">
              {(['video_before', 'video_after'] as const).map((k) => {
                const has = media.some((m) => m.kind === k)
                return (
                  <PhotoButton
                    key={k}
                    jobId={job.id}
                    kind={k}
                    label={`${has ? '✓ ' : ''}${k === 'video_before' ? 'Before' : 'After'} video`}
                    disabled={locked}
                    done={has}
                  />
                )
              })}
            </div>
          </Card>

          <Card title="Upgrades" subtitle="Sell on site — the customer approves on your phone">
            <UpgradeSeller
              jobId={job.id}
              options={upgradeOptions}
              sold={upgrades.map((u) => ({ id: u.id, name: u.name, price: u.price, initials: u.customer_initials }))}
              isMember={isMember}
              locked={locked}
            />
          </Card>

          <Card title="Recommendations" subtitle="Upgrade opportunities for later">
            <RecommendationFlags jobId={job.id} initial={parseRecommendations(job.upgrade_flags)} locked={locked} />
          </Card>

          <Card title="Customer signature">
            {job.customer_signed_at ? (
              <p className="flex items-center gap-2 text-sm text-[#2ECC71]">
                <PenLine className="size-4" aria-hidden="true" /> Signed by {job.customer_signature_name} at {formatBusinessTime(job.customer_signed_at)}
              </p>
            ) : (
              <SignaturePad jobId={job.id} disabled={locked} />
            )}
          </Card>
        </>
      ) : null}

      {inProgress ? (
        <>
          {!openIssue ? <IssueReporter jobId={job.id} /> : null}
          <CompleteButton jobId={job.id} blockers={blockers.filter((b) => !b.startsWith('Tap'))} />
        </>
      ) : null}

      {/* Earnings */}
      {job.status !== 'cancelled' ? (
        <section className="rounded-xl border border-[#27AE60]/30 bg-[#27AE60]/[0.07] p-4 text-sm">
          <p className="mb-2 flex items-center gap-2 font-bold text-[#2ECC71]">
            {job.status === 'complete' ? <CheckCircle2 className="size-4" aria-hidden="true" /> : null}
            {job.status === 'complete' ? 'Job complete — you earned' : 'Your pay if you finish today'}
          </p>
          <dl className="space-y-1 text-[#C9C9CE]">
            <div className="flex justify-between"><dt>Base ({Math.round(pct * 100)}%)</dt><dd>{formatCurrency(pay.base)}</dd></div>
            <div className="flex justify-between"><dt>On-time report bonus</dt><dd>{formatCurrency(pay.turnaround)}</dd></div>
            <div className="flex justify-between"><dt>Upgrades sold ({upgrades.length})</dt><dd>{formatCurrency(pay.upgrades)}</dd></div>
            <div className="flex justify-between"><dt>Video bonus</dt><dd>{formatCurrency(pay.video)}</dd></div>
            <div className="flex justify-between border-t border-white/10 pt-1 font-bold text-white"><dt>Total</dt><dd>{formatCurrency(pay.total)}</dd></div>
          </dl>
          {job.status !== 'complete' ? <p className="mt-2 text-[11px] text-[#8A8A8F]">Estimate — final pay is confirmed when the office reviews the job.</p> : null}
        </section>
      ) : null}

    </main>
  )
}
