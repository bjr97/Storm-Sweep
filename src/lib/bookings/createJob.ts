import { sendBookingConfirmationEmail } from '@/lib/resend'
import { PRICING } from '@/lib/utils'
import { createServiceClient } from '@/lib/supabase/server'
import {
  formatJobDate,
  formatJobWindow,
  sendBookingConfirmedSms,
} from '@/lib/twilio'
import type { Job } from '@/types/database'

import type { BookingPayload } from './types'

async function getUserIdByEmail(email: string): Promise<string | null> {
  const supabase = createServiceClient()
  let page = 1
  const perPage = 1000

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (error) {
      throw error
    }

    const match = data.users.find(
      (user) => user.email?.toLowerCase() === email.toLowerCase()
    )
    if (match) {
      return match.id
    }

    if (data.users.length < perPage) {
      break
    }
    page += 1
  }

  return null
}

async function resolveCustomerId(payload: BookingPayload): Promise<string> {
  const supabase = createServiceClient()
  const existingUserId = await getUserIdByEmail(payload.customerEmail)

  if (existingUserId) {
    await supabase
      .from('profiles')
      .update({
        full_name: payload.customerName,
        phone: payload.customerPhone,
        address: payload.address,
      })
      .eq('id', existingUserId)

    return existingUserId
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: payload.customerEmail,
    email_confirm: true,
    user_metadata: {
      full_name: payload.customerName,
      phone: payload.customerPhone,
    },
  })

  if (error || !data.user) {
    throw error ?? new Error('Failed to create customer account')
  }

  await supabase
    .from('profiles')
    .update({
      full_name: payload.customerName,
      phone: payload.customerPhone,
      address: payload.address,
    })
    .eq('id', data.user.id)

  return data.user.id
}

async function resolvePartnerId(
  referralSource: string | undefined
): Promise<string | null> {
  if (!referralSource) {
    return null
  }

  const supabase = createServiceClient()
  const { data } = await supabase
    .from('partners')
    .select('id')
    .eq('referral_code', referralSource)
    .eq('active', true)
    .maybeSingle()

  return data?.id ?? null
}

export type CreateJobOptions = {
  payload: BookingPayload
  paymentStatus: 'unpaid' | 'deposit_paid' | 'paid'
  stripePaymentIntentId?: string | null
  paypalOrderId?: string | null
  sendSms?: boolean
}

export async function createJobFromBooking(
  options: CreateJobOptions
): Promise<Job> {
  const { payload, paymentStatus, stripePaymentIntentId, paypalOrderId } =
    options
  const supabase = createServiceClient()

  const customerId = await resolveCustomerId(payload)
  const partnerId = await resolvePartnerId(payload.referralSource)
  const depositAmount = Math.round(payload.totalAmount * PRICING.deposit_pct)

  const photoApproved =
    !payload.photoGrade || ['A', 'B'].includes(payload.photoGrade.toUpperCase())

  const { data: job, error } = await supabase
    .from('jobs')
    .insert({
      customer_id: customerId,
      status: 'pending',
      service_type: payload.serviceTypes,
      scheduled_at: payload.scheduledAt ?? null,
      address: payload.address,
      shelter_size: payload.shelterSize,
      notes: payload.notes ?? null,
      total_amount: payload.totalAmount,
      deposit_amount: depositAmount,
      payment_status: paymentStatus,
      stripe_payment_intent_id: stripePaymentIntentId ?? null,
      paypal_order_id: paypalOrderId ?? null,
      photo_urls: payload.photoUrls ?? [],
      photo_grade: payload.photoGrade ?? null,
      photo_flags: payload.photoFlags ?? [],
      photo_approved: photoApproved,
      referral_source: payload.referralSource ?? null,
      partner_id: partnerId,
    })
    .select()
    .single()

  if (error || !job) {
    throw error ?? new Error('Failed to create job')
  }

  if (paymentStatus !== 'unpaid') {
    if (options.sendSms !== false) {
      try {
        await sendBookingConfirmedSms({
          profileId: customerId,
          jobId: job.id,
          phone: payload.customerPhone,
          name: payload.customerName,
          scheduledAt: payload.scheduledAt ?? null,
        })
      } catch (smsError) {
        console.error('[createJob] booking_confirmed SMS failed', smsError)
      }
    }

    try {
      await sendBookingConfirmationEmail({
        to: payload.customerEmail,
        customerName: payload.customerName,
        scheduledDate: formatJobDate(payload.scheduledAt ?? null),
        timeWindow: formatJobWindow(payload.scheduledAt ?? null),
        address: payload.address,
        serviceSummary: payload.serviceTypes.join(', '),
        totalAmount: payload.totalAmount,
        sweeperName: 'your assigned Sweeper',
      })
    } catch (emailError) {
      console.error('[createJob] booking confirmation email failed', emailError)
    }
  }

  return job
}

export async function findJobByPayPalOrderId(
  orderId: string
): Promise<Job | null> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('jobs')
    .select('*')
    .eq('paypal_order_id', orderId)
    .maybeSingle()

  return data
}

export async function findJobById(jobId: string): Promise<Job | null> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', jobId)
    .maybeSingle()

  return data
}

export async function confirmJobPayment(params: {
  jobId: string
  paymentStatus: 'deposit_paid' | 'paid'
  paypalOrderId?: string | null
  stripePaymentIntentId?: string | null
  sendSms?: boolean
}): Promise<Job> {
  const supabase = createServiceClient()
  const existing = await findJobById(params.jobId)

  if (!existing) {
    throw new Error('Job not found')
  }

  if (existing.payment_status !== 'unpaid') {
    return existing
  }

  const { data: job, error } = await supabase
    .from('jobs')
    .update({
      payment_status: params.paymentStatus,
      paypal_order_id: params.paypalOrderId ?? existing.paypal_order_id,
      stripe_payment_intent_id:
        params.stripePaymentIntentId ?? existing.stripe_payment_intent_id,
    })
    .eq('id', params.jobId)
    .select()
    .single()

  if (error || !job) {
    throw error ?? new Error('Failed to update job payment status')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, phone')
    .eq('id', job.customer_id)
    .single()

  const { data: authUser } = await supabase.auth.admin.getUserById(job.customer_id)
  const customerEmail = authUser.user?.email

  if (params.sendSms !== false && profile?.phone) {
    try {
      await sendBookingConfirmedSms({
        profileId: job.customer_id,
        jobId: job.id,
        phone: profile.phone,
        name: profile.full_name ?? 'there',
        scheduledAt: job.scheduled_at,
      })
    } catch (smsError) {
      console.error('[confirmJobPayment] booking_confirmed SMS failed', smsError)
    }
  }

  if (customerEmail) {
    try {
      await sendBookingConfirmationEmail({
        to: customerEmail,
        customerName: profile?.full_name ?? 'there',
        scheduledDate: formatJobDate(job.scheduled_at),
        timeWindow: formatJobWindow(job.scheduled_at),
        address: job.address,
        serviceSummary: job.service_type.join(', '),
        totalAmount: job.total_amount,
        sweeperName: 'your assigned Sweeper',
      })
    } catch (emailError) {
      console.error('[confirmJobPayment] booking confirmation email failed', emailError)
    }
  }

  return job
}

export async function findJobByStripeSessionId(
  sessionId: string
): Promise<Job | null> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('jobs')
    .select('*')
    .eq('stripe_payment_intent_id', sessionId)
    .maybeSingle()

  return data
}
