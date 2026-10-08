import type { VisitUpdateEmailProps } from '@/emails/VisitUpdateEmail'
import { formatBusinessDate } from '@/lib/admin/time'
import { jobTimeLabel } from '@/lib/booking/timeWindows'
import { emailConfigured, sendJobCompleteEmail, sendVisitUpdateEmail } from '@/lib/resend'
import { createServiceClient } from '@/lib/supabase/server'
import { getAppUrl, sendSms } from '@/lib/twilio'
import { formatCurrency } from '@/lib/utils'
import type { Job } from '@/types/database'

/**
 * Who hears about what (server-only). Every send is best-effort: a missing
 * Twilio/Resend setup or a failed send is logged, never surfaced as an error
 * to the person who made the change. sendSms already skips opted-out numbers.
 */

type Person = { id: string; name: string; phone: string | null; email: string | null }

async function person(id: string | null): Promise<Person | null> {
  if (!id) return null
  const supabase = createServiceClient()
  const [{ data: p }, { data: auth }] = await Promise.all([
    supabase.from('profiles').select('id, full_name, phone, is_demo').eq('id', id).maybeSingle(),
    supabase.auth.admin.getUserById(id),
  ])
  // Demo accounts (admin preview) never get real texts or emails.
  if (!p || p.is_demo) return null
  return { id: p.id, name: p.full_name ?? 'there', phone: p.phone, email: auth.user?.email ?? null }
}

async function adminEmails(): Promise<string[]> {
  const supabase = createServiceClient()
  const { data } = await supabase.from('profiles').select('id').eq('role', 'admin')
  const emails = await Promise.all(
    (data ?? []).map(async (a) => (await supabase.auth.admin.getUserById(a.id)).data.user?.email ?? null)
  )
  return emails.filter((e): e is string => Boolean(e))
}

const first = (name: string): string => name.split(/\s+/)[0] || 'there'

async function attempt(label: string, fn: () => Promise<unknown>): Promise<void> {
  try {
    await fn()
  } catch (error) {
    console.error(`[notify] ${label}`, error)
  }
}

async function text(to: string | null | undefined, body: string, trigger: string, profileId: string | null, jobId: string | null): Promise<void> {
  if (!to || !process.env.TWILIO_ACCOUNT_SID) return
  await attempt(`sms ${trigger}`, () => sendSms({ to, body, trigger, profileId, jobId }))
}

async function email(to: string | null | undefined, subject: string, props: VisitUpdateEmailProps): Promise<void> {
  if (!to || !emailConfigured()) return
  await attempt(`email ${subject}`, () => sendVisitUpdateEmail({ to, subject, ...props }))
}

function when(job: Pick<Job, 'scheduled_at' | 'time_window'>): { date: string; window: string } {
  return {
    date: job.scheduled_at ? formatBusinessDate(new Date(job.scheduled_at), { weekday: 'long', month: 'long', day: 'numeric' }) : 'a date to be confirmed',
    window: jobTimeLabel(job.scheduled_at, job.time_window),
  }
}

async function loadJob(jobId: string): Promise<Job | null> {
  const { data } = await createServiceClient().from('jobs').select('*').eq('id', jobId).maybeSingle()
  return data
}

async function tellOffice(subject: string, body: string, jobId: string): Promise<void> {
  const link = `${getAppUrl()}/admin/jobs/${jobId}`
  await text(process.env.ADMIN_PHONE_NUMBER, `${body} ${link}`, 'admin_alert', null, jobId)
  for (const to of await adminEmails()) {
    await email(to, subject, { preview: body, title: subject, greeting: 'Heads up,', message: body, rows: [], ctaLabel: 'Open the job', ctaUrl: link })
  }
}

/** Customer moved their visit (portal). */
export async function notifyRescheduled(jobId: string): Promise<void> {
  const job = await loadJob(jobId)
  if (!job) return
  const [customer, sweeper] = await Promise.all([person(job.customer_id), person(job.sweeper_id)])
  const { date, window } = when(job)
  const portal = `${getAppUrl()}/history/${job.id}`

  if (customer) {
    await text(customer.phone, `Storm Sweep: your visit is now ${date}, ${window}. Need another change? ${portal}`, 'visit_rescheduled', customer.id, job.id)
    await email(customer.email, `Your Storm Sweep visit moved to ${date}`, {
      preview: `New time: ${date}, ${window}`,
      title: 'Your visit was rescheduled',
      greeting: `Hi ${first(customer.name)},`,
      message: 'Your Storm Sweep visit has been moved. Here are the new details:',
      rows: [{ label: 'Date', value: date }, { label: 'Arrival window', value: window }, { label: 'Address', value: job.address }],
      ctaLabel: 'View your visit',
      ctaUrl: portal,
      footnote: 'You can reschedule or cancel online until 48 hours before your visit.',
    })
  }
  if (sweeper) {
    await text(sweeper.phone, `Storm Sweep: ${first(customer?.name ?? 'A customer')} moved their visit to ${date}, ${window}. Can't make it? Drop it in the app — no penalty. ${getAppUrl()}/sweeper`, 'sweeper_job_changed', sweeper.id, job.id)
  }
  await tellOffice('Visit rescheduled', `${customer?.name ?? 'A customer'} moved their visit to ${date}, ${window}.`, job.id)
}

/** Customer cancelled (portal) — or the office did (admin). */
export async function notifyCancelled(jobId: string, by: 'customer' | 'admin'): Promise<void> {
  const job = await loadJob(jobId)
  if (!job) return
  const [customer, sweeper] = await Promise.all([person(job.customer_id), person(job.sweeper_id)])
  const { date } = when(job)
  const refundLine = job.refund_due ? ` Your ${formatCurrency(job.deposit_amount ?? 0)} deposit will be refunded within a few business days.` : ''

  if (customer) {
    const lead = by === 'customer' ? 'Your visit is cancelled.' : 'We’ve cancelled your visit.'
    await text(customer.phone, `Storm Sweep: ${lead} (${date}).${refundLine} Book again anytime: ${getAppUrl()}/book`, 'visit_cancelled', customer.id, job.id)
    await email(customer.email, `Your Storm Sweep visit on ${date} is cancelled`, {
      preview: lead,
      title: 'Visit cancelled',
      greeting: `Hi ${first(customer.name)},`,
      message: `${lead}${refundLine}`,
      rows: [{ label: 'Was scheduled', value: date }, { label: 'Address', value: job.address }],
      ctaLabel: 'Book another visit',
      ctaUrl: `${getAppUrl()}/book`,
    })
  }
  if (sweeper) {
    await text(sweeper.phone, `Storm Sweep: the ${date} visit for ${first(customer?.name ?? 'a customer')} was cancelled — it's off your schedule.`, 'sweeper_job_changed', sweeper.id, job.id)
  }
  if (by === 'customer') {
    await tellOffice('Visit cancelled', `${customer?.name ?? 'A customer'} cancelled their ${date} visit.${job.refund_due ? ' Refund due.' : ''}`, job.id)
  }
}

/** Visit done: email the report with before/after photo links (texts are sent separately). */
export async function emailCompletionReport(jobId: string): Promise<void> {
  if (!emailConfigured()) return
  const job = await loadJob(jobId)
  if (!job) return
  const customer = await person(job.customer_id)
  if (!customer?.email) return
  const supabase = createServiceClient()
  const { data: photos } = await supabase.from('job_photos').select('photo_type, storage_path').eq('job_id', jobId).in('photo_type', ['before', 'after'])
  const paths = (photos ?? []).map((p) => p.storage_path)
  const signed = new Map<string, string>()
  if (paths.length) {
    const { data } = await supabase.storage.from('job-photos').createSignedUrls(paths, 7 * 86_400)
    for (const u of data ?? []) if (u.path && u.signedUrl) signed.set(u.path, u.signedUrl)
  }
  const urls = (type: string): string[] =>
    (photos ?? []).filter((p) => p.photo_type === type).map((p) => signed.get(p.storage_path)).filter((u): u is string => Boolean(u))
  await attempt('job complete email', () =>
    sendJobCompleteEmail({
      to: customer.email!,
      customerName: first(customer.name),
      completedDate: job.completed_at ? formatBusinessDate(new Date(job.completed_at), { month: 'long', day: 'numeric', year: 'numeric' }) : 'today',
      address: job.address,
      serviceSummary: job.service_type.join(', '),
      beforePhotoUrls: urls('before'),
      afterPhotoUrls: urls('after'),
      jobId: job.id,
    })
  )
}

/** Office changed an upcoming visit's time and/or price. */
export async function notifyVisitUpdated(jobId: string, change: { timeChanged: boolean; priceChanged: boolean }): Promise<void> {
  const job = await loadJob(jobId)
  if (!job) return
  const [customer, sweeper] = await Promise.all([person(job.customer_id), person(job.sweeper_id)])
  const { date, window } = when(job)
  const portal = `${getAppUrl()}/history/${job.id}`
  const parts = [
    change.timeChanged ? `new time: ${date}, ${window}` : null,
    change.priceChanged ? `visit total: ${formatCurrency(job.total_amount)}` : null,
  ].filter(Boolean)

  if (customer) {
    await text(customer.phone, `Storm Sweep: your visit was updated — ${parts.join('; ')}. Details: ${portal}`, 'visit_updated', customer.id, job.id)
    await email(customer.email, 'Your Storm Sweep visit was updated', {
      preview: `Updated: ${parts.join('; ')}`,
      title: 'Your visit was updated',
      greeting: `Hi ${first(customer.name)},`,
      message: 'We’ve updated your upcoming Storm Sweep visit. Here are the current details:',
      rows: [
        { label: 'Date', value: date },
        { label: 'Arrival window', value: window },
        { label: 'Visit total', value: formatCurrency(job.total_amount) },
        { label: 'Services', value: job.service_type.join(', ') },
      ],
      ctaLabel: 'View your visit',
      ctaUrl: portal,
      footnote: 'Questions? Just reply to our texts or call us.',
    })
  }
  if (sweeper && change.timeChanged) {
    await text(sweeper.phone, `Storm Sweep: the office moved ${first(customer?.name ?? 'a customer')}'s visit to ${date}, ${window}. Can't make it? Drop it in the app — no penalty.`, 'sweeper_job_changed', sweeper.id, job.id)
  }
}

/** Balance collected — send the customer a receipt. */
export async function notifyBalancePaid(jobId: string, amount: number): Promise<void> {
  const job = await loadJob(jobId)
  if (!job) return
  const customer = await person(job.customer_id)
  if (!customer) return
  const portal = `${getAppUrl()}/history/${job.id}`
  await text(customer.phone, `Storm Sweep: we received your ${formatCurrency(amount)} payment — your visit is paid in full. Thank you! Receipt: ${portal}`, 'balance_paid', customer.id, job.id)
  await email(customer.email, `Payment received — ${formatCurrency(amount)}`, {
    preview: 'Your Storm Sweep visit is paid in full',
    title: 'Payment received',
    greeting: `Hi ${first(customer.name)},`,
    message: 'Thank you — your Storm Sweep visit is paid in full.',
    rows: [
      { label: 'Amount received', value: formatCurrency(amount) },
      { label: 'Visit total', value: formatCurrency(job.total_amount) },
      { label: 'Services', value: job.service_type.join(', ') },
    ],
    ctaLabel: 'View your report',
    ctaUrl: portal,
  })
}
