import { sendBookingConfirmationEmail } from '@/lib/resend'
import { calculateDeposit } from '@/lib/utils'
import { getUserIdByEmail } from '@/lib/auth/users'
import { spendCredit } from '@/lib/customer/referrals'
import { createServiceClient } from '@/lib/supabase/server'
import {
  formatJobDate,
  formatJobWindow,
  sendBookingConfirmedSms,
} from '@/lib/twilio'
import type { Job } from '@/types/database'

import type { BookingPayload } from './types'


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
        // Unticking the photo box always opts out; ticking never overrides an earlier opt-out.
        ...(payload.marketingPhotoConsent === false ? { marketing_photo_consent: false } : {}),
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
      marketing_photo_consent: payload.marketingPhotoConsent ?? true,
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
    .eq('referral_code', referralSource.trim().toUpperCase()) // codes are stored uppercase
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
  /** Send the booking confirmation even though nothing was paid online (office phone bookings). */
  confirmUnpaid?: boolean
}

export async function createJobFromBooking(
  options: CreateJobOptions
): Promise<Job> {
  const { payload, paymentStatus, stripePaymentIntentId, paypalOrderId } =
    options
  const supabase = createServiceClient()

  const customerId = await resolveCustomerId(payload)
  const partnerId = await resolvePartnerId(payload.referralSource)
  const depositAmount = calculateDeposit(payload.totalAmount)
  // A demo customer's bookings stay demo (hidden from reports, demo-only job board).
  const { data: owner } = await supabase.from('profiles').select('is_demo').eq('id', customerId).maybeSingle()

  const photoApproved =
    !payload.photoGrade || ['A', 'B'].includes(payload.photoGrade.toUpperCase())

  const { data: job, error } = await supabase
    .from('jobs')
    .insert({
      customer_id: customerId,
      is_demo: owner?.is_demo ?? false,
      status: 'pending',
      service_type: payload.serviceTypes,
      scheduled_at: payload.scheduledAt ?? null,
      time_window: payload.timeWindow ?? null,
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
      membership_visit: payload.membershipVisit,
      referred_by: payload.referredBy ?? null,
      referral_discount: payload.referralDiscount ?? 0,
      credit_applied: payload.creditApplied ?? 0,
      promo_code_id: payload.promoCodeId ?? null,
      promo_discount: payload.promoDiscount ?? 0,
      service_value: payload.serviceValue ?? payload.totalAmount,
    })
    .select()
    .single()

  if (error || !job) {
    throw error ?? new Error('Failed to create job')
  }

  // Referral credit used on this booking is spent once it's paid for.
  if ((payload.creditApplied ?? 0) > 0 && paymentStatus !== 'unpaid') {
    await spendCredit(customerId, payload.creditApplied ?? 0)
  }

  if (payload.membershipVisit && paymentStatus !== 'unpaid') {
    // Count this clean toward the member's 2 included visits. Callers dedupe
    // on the Stripe session, so this runs once per booking.
    const { data: profile } = await supabase
      .from('profiles')
      .select('visits_used')
      .eq('id', customerId)
      .single()
    await supabase
      .from('profiles')
      .update({ visits_used: (profile?.visits_used ?? 0) + 1 })
      .eq('id', customerId)
  }

  if (paymentStatus !== 'unpaid' || options.confirmUnpaid) {
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
        timeWindow: formatJobWindow(payload.scheduledAt ?? null, payload.timeWindow),
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
        timeWindow: formatJobWindow(job.scheduled_at, job.time_window),
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
