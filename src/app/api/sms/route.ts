import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import {
  buildTemplateDataFromContext,
  renderSmsTemplate,
  resolveSmsContext,
  sendSms,
  type SmsTrigger,
} from '@/lib/twilio'

const smsTriggerSchema = z.enum([
  'booking_confirmed',
  'day_before_reminder',
  'on_the_way',
  'job_started',
  'job_complete',
  'review_request',
  'membership_renewal',
  'tornado_season',
  'sweeper_welcome',
  'sweeper_new_job',
])

const smsRequestSchema = z.object({
  trigger: smsTriggerSchema,
  jobId: z.string().uuid().optional(),
  profileId: z.string().uuid().optional(),
  customData: z.record(z.string(), z.unknown()).optional(),
})

async function isAuthorized(req: Request): Promise<boolean> {
  const internalSecret = process.env.INTERNAL_API_SECRET
  if (internalSecret && req.headers.get('x-internal-secret') === internalSecret) {
    return true
  }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return false

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return profile?.role === 'admin' || profile?.role === 'sweeper'
}

export async function POST(req: Request): Promise<Response> {
  try {
    if (!(await isAuthorized(req))) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: unknown = await req.json()
    const parsed = smsRequestSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { trigger, jobId, profileId, customData = {} } = parsed.data

    if (!jobId && !profileId) {
      return Response.json(
        { error: 'Either jobId or profileId is required' },
        { status: 400 }
      )
    }

    const { job, profile, sweeper } = await resolveSmsContext(jobId, profileId)

    const recipientPhone =
      (customData.phone as string | undefined) ?? profile?.phone

    if (!recipientPhone) {
      return Response.json(
        { error: 'No phone number found for recipient', code: 'NO_PHONE' },
        { status: 422 }
      )
    }

    const templateData = buildTemplateDataFromContext(
      trigger as SmsTrigger,
      job,
      profile,
      sweeper,
      customData
    )

    const messageBody = renderSmsTemplate(trigger as SmsTrigger, templateData)

    const result = await sendSms({
      to: recipientPhone,
      body: messageBody,
      trigger,
      profileId: profileId ?? profile?.id ?? job?.customer_id ?? null,
      jobId: jobId ?? job?.id ?? null,
    })

    return Response.json({
      data: {
        sid: result.sid,
        body: result.body,
        trigger,
      },
      message: 'SMS sent successfully',
    })
  } catch (error) {
    console.error('[sms]', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
