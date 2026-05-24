import twilio from 'twilio'

import { createServiceClient } from '@/lib/supabase/server'
import type { Job, Profile } from '@/types/database'

export type SmsTrigger =
  | 'booking_confirmed'
  | 'day_before_reminder'
  | 'on_the_way'
  | 'job_started'
  | 'job_complete'
  | 'review_request'
  | 'membership_renewal'
  | 'tornado_season'
  | 'sweeper_welcome'
  | 'sweeper_new_job'
  | 'sweeper_application_admin'
  | 'sweeper_declined'

export type SmsTemplateData = {
  booking_confirmed: {
    name: string
    date: string
    window: string
    sweeperName: string
  }
  day_before_reminder: {
    name: string
    window: string
  }
  on_the_way: {
    sweeperName: string
  }
  job_started: Record<string, never>
  job_complete: {
    name: string
    portalUrl: string
    hasUpgrades: boolean
  }
  review_request: {
    googleUrl: string
  }
  membership_renewal: {
    name: string
    date: string
    bookUrl: string
  }
  tornado_season: {
    bookUrl: string
  }
  sweeper_welcome: {
    name: string
    loginUrl: string
    tempPassword: string
  }
  sweeper_new_job: {
    customerName: string
    address: string
    date: string
  }
  sweeper_application_admin: {
    name: string
    email: string
    phone: string
  }
  sweeper_declined: {
    name: string
  }
}

export const SMS_TEMPLATES = {
  booking_confirmed: (
    name: string,
    date: string,
    window: string,
    sweeperName: string
  ): string =>
    `Hi ${name}! Your Storm Sweep is confirmed for ${date} between ${window}. Your Sweeper will be ${sweeperName}. We'll text when they're on the way. Questions? Reply here. – Storm Sweep 🌪️`,

  day_before_reminder: (name: string, window: string): string =>
    `Reminder: Storm Sweep is tomorrow between ${window}. Please make sure the garage is accessible. Reply RESCHEDULE if needed. – Storm Sweep`,

  on_the_way: (sweeperName: string): string =>
    `Your Sweeper ${sweeperName} is on the way — about 15 minutes out. See you soon! 🌪️`,

  job_started: (): string =>
    `Your shelter cleaning is underway! Before photos uploaded. Follow along in your portal. ✅`,

  job_complete: (
    name: string,
    portalUrl: string,
    hasUpgrades: boolean
  ): string =>
    `Your Storm Sweep is complete! 🎉 Before & after photos + your service report are ready: ${portalUrl}${hasUpgrades ? ' Your Sweeper noted some upgrade recommendations — check your report.' : ''} Thank you, ${name}!`,

  review_request: (googleUrl: string): string =>
    `Hi! Hope everything looks great. If you have 30 seconds, a Google review means the world to a small local business. 🙏 ${googleUrl} — Storm Sweep, Norman OK`,

  membership_renewal: (name: string, date: string, bookUrl: string): string =>
    `Hey ${name} — your Storm Ready membership renews in 30 days on ${date}. Auto-renews via Stripe. Time to schedule your next visit? ${bookUrl} 🌪️`,

  tornado_season: (bookUrl: string): string =>
    `🌪️ Tornado season is here, Norman. Is your shelter ready? Storm Sweep is booking fast — secure your spot before May. Book now: ${bookUrl} — Storm Sweep, your local shelter pros.`,

  sweeper_welcome: (name: string, loginUrl: string, tempPassword: string): string =>
    `Welcome to Storm Sweep, ${name}! 🌪️ Your Sweeper account is live. Login: ${loginUrl} — temp password: ${tempPassword}. Change it on first login.`,

  sweeper_new_job: (customerName: string, address: string, date: string): string =>
    `New Storm Sweep job available: ${customerName} at ${address} on ${date}. Open your app to accept. Faster accept = higher pay! 🌪️`,

  sweeper_application_admin: (name: string, email: string, phone: string): string =>
    `🌪️ New Sweeper application: ${name} (${email}, ${phone}). Review in admin portal.`,

  sweeper_declined: (name: string): string =>
    `Hi ${name}, thank you for applying to Storm Sweep. We are not moving forward at this time, but we appreciate your interest. Best of luck! – Storm Sweep`,
} as const

export interface SendSmsParams {
  to: string
  body: string
  trigger: string
  profileId?: string | null
  jobId?: string | null
}

export interface SendSmsResult {
  sid: string
  body: string
}

function getTwilioClient(): twilio.Twilio {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  if (!accountSid || !authToken) {
    throw new Error('Twilio credentials are not configured')
  }
  return twilio(accountSid, authToken)
}

function getFromNumber(): string {
  const from = process.env.TWILIO_PHONE_NUMBER
  if (!from) {
    throw new Error('TWILIO_PHONE_NUMBER is not configured')
  }
  return from
}

export function renderSmsTemplate<T extends SmsTrigger>(
  trigger: T,
  data: SmsTemplateData[T]
): string {
  switch (trigger) {
    case 'booking_confirmed': {
      const d = data as SmsTemplateData['booking_confirmed']
      return SMS_TEMPLATES.booking_confirmed(
        d.name,
        d.date,
        d.window,
        d.sweeperName
      )
    }
    case 'day_before_reminder': {
      const d = data as SmsTemplateData['day_before_reminder']
      return SMS_TEMPLATES.day_before_reminder(d.name, d.window)
    }
    case 'on_the_way': {
      const d = data as SmsTemplateData['on_the_way']
      return SMS_TEMPLATES.on_the_way(d.sweeperName)
    }
    case 'job_started':
      return SMS_TEMPLATES.job_started()
    case 'job_complete': {
      const d = data as SmsTemplateData['job_complete']
      return SMS_TEMPLATES.job_complete(d.name, d.portalUrl, d.hasUpgrades)
    }
    case 'review_request': {
      const d = data as SmsTemplateData['review_request']
      return SMS_TEMPLATES.review_request(d.googleUrl)
    }
    case 'membership_renewal': {
      const d = data as SmsTemplateData['membership_renewal']
      return SMS_TEMPLATES.membership_renewal(d.name, d.date, d.bookUrl)
    }
    case 'tornado_season': {
      const d = data as SmsTemplateData['tornado_season']
      return SMS_TEMPLATES.tornado_season(d.bookUrl)
    }
    case 'sweeper_welcome': {
      const d = data as SmsTemplateData['sweeper_welcome']
      return SMS_TEMPLATES.sweeper_welcome(d.name, d.loginUrl, d.tempPassword)
    }
    case 'sweeper_new_job': {
      const d = data as SmsTemplateData['sweeper_new_job']
      return SMS_TEMPLATES.sweeper_new_job(d.customerName, d.address, d.date)
    }
    case 'sweeper_application_admin': {
      const d = data as SmsTemplateData['sweeper_application_admin']
      return SMS_TEMPLATES.sweeper_application_admin(d.name, d.email, d.phone)
    }
    case 'sweeper_declined': {
      const d = data as SmsTemplateData['sweeper_declined']
      return SMS_TEMPLATES.sweeper_declined(d.name)
    }
    default: {
      const _exhaustive: never = trigger
      throw new Error(`Unknown SMS trigger: ${String(_exhaustive)}`)
    }
  }
}

export async function sendSms(params: SendSmsParams): Promise<SendSmsResult> {
  const client = getTwilioClient()
  const message = await client.messages.create({
    body: params.body,
    from: getFromNumber(),
    to: params.to,
  })

  const supabase = createServiceClient()
  const { error } = await supabase.from('sms_log').insert({
    profile_id: params.profileId ?? null,
    job_id: params.jobId ?? null,
    trigger: params.trigger,
    body: params.body,
    twilio_sid: message.sid,
  })

  if (error) {
    console.error('[twilio] sms_log insert failed', error)
  }

  return { sid: message.sid, body: params.body }
}

export async function sendBookingConfirmedSms(params: {
  profileId: string
  jobId: string
  phone: string
  name: string
  scheduledAt: string | null
  sweeperName?: string
}): Promise<SendSmsResult> {
  const { job, profile, sweeper } = await resolveSmsContext(
    params.jobId,
    params.profileId
  )

  const templateData = buildTemplateDataFromContext(
    'booking_confirmed',
    job,
    profile,
    sweeper,
    {
      name: params.name,
      date: formatJobDate(params.scheduledAt),
      window: formatJobWindow(params.scheduledAt),
      sweeperName: params.sweeperName,
    }
  )

  const body = renderSmsTemplate('booking_confirmed', templateData)

  return sendSms({
    to: params.phone,
    body,
    trigger: 'booking_confirmed',
    profileId: params.profileId,
    jobId: params.jobId,
  })
}

export async function sendAdminPhotoReviewSms(params: {
  jobId: string
  grade: string
  address: string
  adminNote: string
}): Promise<SendSmsResult | null> {
  const adminPhone = process.env.ADMIN_PHONE_NUMBER
  if (!adminPhone) {
    console.warn('[twilio] ADMIN_PHONE_NUMBER not set — skipping admin alert')
    return null
  }

  const body = `🌪️ Photo review needed — Grade ${params.grade} for job at ${params.address}. Job ID: ${params.jobId}. ${params.adminNote} — Storm Sweep Admin`

  return sendSms({
    to: adminPhone,
    body,
    trigger: 'admin_photo_review',
    jobId: params.jobId,
  })
}

export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
}

export function formatJobDate(scheduledAt: string | null): string {
  if (!scheduledAt) return 'TBD'
  return new Date(scheduledAt).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'America/Chicago',
  })
}

export function formatJobWindow(scheduledAt: string | null): string {
  if (!scheduledAt) return 'TBD'
  const start = new Date(scheduledAt)
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000)
  const fmt = (d: Date): string =>
    d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'America/Chicago',
    })
  return `${fmt(start)}–${fmt(end)}`
}

export async function resolveSmsContext(
  jobId?: string,
  profileId?: string
): Promise<{ job: Job | null; profile: Profile | null; sweeper: Profile | null }> {
  const supabase = createServiceClient()
  let job: Job | null = null
  let profile: Profile | null = null
  let sweeper: Profile | null = null

  if (jobId) {
    const { data } = await supabase.from('jobs').select('*').eq('id', jobId).single()
    job = data
  }

  const resolvedProfileId = profileId ?? job?.customer_id
  if (resolvedProfileId) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', resolvedProfileId)
      .single()
    profile = data
  }

  if (job?.sweeper_id) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', job.sweeper_id)
      .single()
    sweeper = data
  }

  return { job, profile, sweeper }
}

export function buildTemplateDataFromContext(
  trigger: SmsTrigger,
  job: Job | null,
  profile: Profile | null,
  sweeper: Profile | null,
  customData: Record<string, unknown> = {}
): SmsTemplateData[SmsTrigger] {
  const appUrl = getAppUrl()
  const name = (customData.name as string) ?? profile?.full_name ?? 'there'
  const sweeperName =
    (customData.sweeperName as string) ?? sweeper?.full_name ?? 'your assigned Sweeper'

  switch (trigger) {
    case 'booking_confirmed':
      return {
        name,
        date: (customData.date as string) ?? formatJobDate(job?.scheduled_at ?? null),
        window:
          (customData.window as string) ??
          formatJobWindow(job?.scheduled_at ?? null),
        sweeperName,
      }
    case 'day_before_reminder':
      return {
        name,
        window:
          (customData.window as string) ??
          formatJobWindow(job?.scheduled_at ?? null),
      }
    case 'on_the_way':
      return { sweeperName }
    case 'job_started':
      return {}
    case 'job_complete': {
      const jobPortalUrl =
        job != null ? `${appUrl}/history/${job.id}` : `${appUrl}/dashboard`
      return {
        name,
        portalUrl: (customData.portalUrl as string) ?? jobPortalUrl,
        hasUpgrades:
          (customData.hasUpgrades as boolean) ??
          (job?.upgrade_flags != null &&
            typeof job.upgrade_flags === 'object' &&
            Object.keys(job.upgrade_flags as object).length > 0),
      }
    }
    case 'review_request':
      return {
        googleUrl:
          (customData.googleUrl as string) ??
          'https://g.page/r/stormsweep/review',
      }
    case 'membership_renewal':
      return {
        name,
        date:
          (customData.date as string) ??
          (profile?.membership_renews_at
            ? new Date(profile.membership_renews_at).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
                timeZone: 'America/Chicago',
              })
            : 'soon'),
        bookUrl: (customData.bookUrl as string) ?? `${appUrl}/book`,
      }
    case 'tornado_season':
      return {
        bookUrl: (customData.bookUrl as string) ?? `${appUrl}/book`,
      }
    case 'sweeper_welcome':
      return {
        name,
        loginUrl: (customData.loginUrl as string) ?? `${appUrl}/login`,
        tempPassword: (customData.tempPassword as string) ?? '',
      }
    case 'sweeper_new_job':
      return {
        customerName:
          (customData.customerName as string) ?? profile?.full_name ?? 'Customer',
        address: (customData.address as string) ?? job?.address ?? '',
        date:
          (customData.date as string) ?? formatJobDate(job?.scheduled_at ?? null),
      }
    case 'sweeper_application_admin':
      return {
        name: (customData.name as string) ?? name,
        email: (customData.email as string) ?? '',
        phone: (customData.phone as string) ?? profile?.phone ?? '',
      }
    case 'sweeper_declined':
      return { name }
    default: {
      const _exhaustive: never = trigger
      throw new Error(`Unknown SMS trigger: ${String(_exhaustive)}`)
    }
  }
}
