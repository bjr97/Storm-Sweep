import { dayRange, formatBusinessDate, localDate, localMidnight } from '@/lib/admin/time'
import { createServiceClient } from '@/lib/supabase/server'
import {
  buildTemplateDataFromContext,
  getAppUrl,
  renderSmsTemplate,
  resolveSmsContext,
  sendSms,
  type SmsTemplateData,
  type SmsTrigger,
} from '@/lib/twilio'

/**
 * Daily customer texts (run by Vercel Cron, see vercel.json). Every message
 * is sent at most once — sms_log is checked first — so re-running is safe.
 * If Twilio isn't configured yet, nothing is logged and tomorrow retries.
 *   - day_before_reminder: confirmed visits scheduled tomorrow
 *   - review_request: visits completed in the last 72h with no review yet
 *   - membership_renewal: active members renewing in ~30 days
 *   - tornado_season: Feb 15–Mar 31, past customers with no visit in 120 days
 *     and nothing upcoming; once a year each, max 50/day
 */

export type TaskResult = { eligible: number; sent: number; skipped: number; failed: number; note?: string }
export type DailyResult = { ranAt: string; twilioConfigured: boolean; tasks: Record<string, TaskResult> }

/** Yearly "is your shelter ready?" campaign window (business dates) and pacing. */
export const TORNADO_CAMPAIGN = { start: { month: 2, day: 15 }, end: { month: 3, day: 31 }, dailyLimit: 50, quietDays: 120 } as const

export function inTornadoSeason(month: number, day: number): boolean {
  const md = month * 100 + day
  const { start, end } = TORNADO_CAMPAIGN
  return md >= start.month * 100 + start.day && md <= end.month * 100 + end.day
}

const twilioConfigured = (): boolean =>
  Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER)

async function alreadySent(trigger: string, where: { jobId?: string; profileId?: string; sinceDays?: number }): Promise<boolean> {
  let q = createServiceClient().from('sms_log').select('id', { count: 'exact', head: true }).eq('trigger', trigger)
  if (where.jobId) q = q.eq('job_id', where.jobId)
  if (where.profileId) q = q.eq('profile_id', where.profileId)
  if (where.sinceDays) q = q.gte('sent_at', new Date(Date.now() - where.sinceDays * 86_400_000).toISOString())
  const { count, error } = await q
  if (error) throw error
  return (count ?? 0) > 0
}

async function sendOne(
  trigger: Extract<SmsTrigger, 'day_before_reminder' | 'review_request' | 'membership_renewal' | 'tornado_season'>,
  ids: { jobId?: string; profileId?: string },
  custom: Record<string, unknown>,
  result: TaskResult
): Promise<void> {
  const { job, profile, sweeper } = await resolveSmsContext(ids.jobId, ids.profileId)
  if (!profile?.phone) {
    result.skipped += 1
    return
  }
  if (!twilioConfigured()) {
    result.skipped += 1
    result.note = 'Twilio not configured — will send once it is'
    return
  }
  try {
    const data = buildTemplateDataFromContext(trigger, job, profile, sweeper, custom)
    const sent = await sendSms({
      to: profile.phone,
      body: renderSmsTemplate(trigger, data as SmsTemplateData[typeof trigger]),
      trigger,
      profileId: profile.id,
      jobId: ids.jobId ?? null,
    })
    if (sent.skipped) result.skipped += 1
    else result.sent += 1
  } catch (error) {
    console.error(`[automation/${trigger}]`, error)
    result.failed += 1
  }
}

export async function runDailyAutomations(now: Date = new Date()): Promise<DailyResult> {
  const supabase = createServiceClient()
  const appUrl = getAppUrl()
  const t = localDate(now)
  const tomorrow = { start: localMidnight(t.year, t.month, t.day + 1), end: localMidnight(t.year, t.month, t.day + 2) }
  const tasks: Record<string, TaskResult> = {}

  // 1) Day-before reminders
  {
    const r: TaskResult = { eligible: 0, sent: 0, skipped: 0, failed: 0 }
    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('id')
      .eq('status', 'confirmed')
      .gte('scheduled_at', tomorrow.start.toISOString())
      .lt('scheduled_at', tomorrow.end.toISOString())
    if (error) throw error
    for (const j of jobs) {
      if (await alreadySent('day_before_reminder', { jobId: j.id })) continue
      r.eligible += 1
      await sendOne('day_before_reminder', { jobId: j.id }, {}, r)
    }
    tasks.dayBeforeReminders = r
  }

  // 2) Review requests (evening of / days after completion; only if no review yet)
  {
    const r: TaskResult = { eligible: 0, sent: 0, skipped: 0, failed: 0 }
    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('id')
      .eq('status', 'complete')
      .gte('completed_at', new Date(now.getTime() - 72 * 3_600_000).toISOString())
      .lt('completed_at', dayRange(now).end.toISOString())
    if (error) throw error
    const ids = jobs.map((j) => j.id)
    const { data: reviewed } = ids.length ? await supabase.from('reviews').select('job_id').in('job_id', ids) : { data: [] }
    const done = new Set((reviewed ?? []).map((x) => x.job_id))
    for (const id of ids) {
      if (done.has(id) || (await alreadySent('review_request', { jobId: id }))) continue
      r.eligible += 1
      await sendOne('review_request', { jobId: id }, { googleUrl: `${appUrl}/history/${id}` }, r)
    }
    tasks.reviewRequests = r
  }

  // 3) Membership renewal notices (~30 days out)
  {
    const r: TaskResult = { eligible: 0, sent: 0, skipped: 0, failed: 0 }
    const { data: members, error } = await supabase
      .from('profiles')
      .select('id, membership_renews_at')
      .eq('membership_status', 'active')
      .gte('membership_renews_at', localMidnight(t.year, t.month, t.day + 29).toISOString())
      .lt('membership_renews_at', localMidnight(t.year, t.month, t.day + 32).toISOString())
    if (error) throw error
    for (const m of members) {
      if (await alreadySent('membership_renewal', { profileId: m.id, sinceDays: 60 })) continue
      r.eligible += 1
      await sendOne(
        'membership_renewal',
        { profileId: m.id },
        {
          date: m.membership_renews_at
            ? formatBusinessDate(new Date(m.membership_renews_at), { month: 'long', day: 'numeric', year: 'numeric' })
            : 'soon',
          bookUrl: `${appUrl}/book`,
        },
        r
      )
    }
    tasks.renewalNotices = r
  }

  // 4) Tornado-season campaign (Feb 15 – Mar 31): past customers who are due.
  if (inTornadoSeason(t.month, t.day)) {
    const r: TaskResult = { eligible: 0, sent: 0, skipped: 0, failed: 0 }
    const since = new Date(now.getTime() - TORNADO_CAMPAIGN.quietDays * 86_400_000).toISOString()
    const { data: recent, error: rErr } = await supabase
      .from('jobs')
      .select('customer_id')
      .neq('status', 'cancelled')
      .or(`scheduled_at.gte.${since},status.in.(pending,confirmed,in_progress)`)
    if (rErr) throw rErr
    const busy = new Set(recent.map((j) => j.customer_id))
    const { data: past, error: pErr } = await supabase.from('jobs').select('customer_id').eq('status', 'complete')
    if (pErr) throw pErr
    const candidates = Array.from(new Set(past.map((j) => j.customer_id))).filter((id) => !busy.has(id))
    for (const id of candidates) {
      if (r.sent + r.skipped + r.failed >= TORNADO_CAMPAIGN.dailyLimit) break
      if (await alreadySent('tornado_season', { profileId: id, sinceDays: 200 })) continue
      r.eligible += 1
      await sendOne('tornado_season', { profileId: id }, { bookUrl: `${appUrl}/book` }, r)
    }
    tasks.tornadoSeason = r
  }

  return { ranAt: now.toISOString(), twilioConfigured: twilioConfigured(), tasks }
}
