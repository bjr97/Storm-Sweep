import { Resend } from 'resend'

import { BookingConfirmationEmail } from '@/emails/BookingConfirmationEmail'
import { JobCompleteEmail } from '@/emails/JobCompleteEmail'
import { MembershipReceiptEmail } from '@/emails/MembershipReceiptEmail'
import { MembershipWelcomeEmail } from '@/emails/MembershipWelcomeEmail'
import { getAppUrl } from '@/lib/twilio'
import { formatCurrency } from '@/lib/utils'

export interface SendEmailResult {
  id: string
}

function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured')
  }
  return new Resend(apiKey)
}

function getFromEmail(): string {
  const from = process.env.RESEND_FROM_EMAIL
  if (!from) {
    throw new Error('RESEND_FROM_EMAIL is not configured')
  }
  return from
}

export interface BookingConfirmationEmailParams {
  to: string
  customerName: string
  scheduledDate: string
  timeWindow: string
  address: string
  serviceSummary: string
  totalAmount: number
  sweeperName: string
  portalUrl?: string
}

export async function sendBookingConfirmationEmail(
  params: BookingConfirmationEmailParams
): Promise<SendEmailResult> {
  const resend = getResendClient()
  const appUrl = getAppUrl()

  const { data, error } = await resend.emails.send({
    from: getFromEmail(),
    to: params.to,
    subject: `Storm Sweep confirmed — ${params.scheduledDate}`,
    react: BookingConfirmationEmail({
      customerName: params.customerName,
      scheduledDate: params.scheduledDate,
      timeWindow: params.timeWindow,
      address: params.address,
      serviceSummary: params.serviceSummary,
      totalAmount: formatCurrency(params.totalAmount),
      sweeperName: params.sweeperName,
      portalUrl: params.portalUrl ?? `${appUrl}/dashboard`,
    }),
  })

  if (error) {
    throw new Error(error.message)
  }

  return { id: data?.id ?? '' }
}

export interface JobCompleteEmailParams {
  to: string
  customerName: string
  completedDate: string
  address: string
  serviceSummary: string
  beforePhotoUrls: string[]
  afterPhotoUrls: string[]
  upgradeNotes?: string | null
  jobId: string
  portalUrl?: string
}

export async function sendJobCompleteEmail(
  params: JobCompleteEmailParams
): Promise<SendEmailResult> {
  const resend = getResendClient()
  const appUrl = getAppUrl()
  const portalUrl = params.portalUrl ?? `${appUrl}/dashboard`
  const reportUrl = `${appUrl}/history/${params.jobId}`

  const { data, error } = await resend.emails.send({
    from: getFromEmail(),
    to: params.to,
    subject: 'Your Storm Sweep is complete — view your photos',
    react: JobCompleteEmail({
      customerName: params.customerName,
      completedDate: params.completedDate,
      address: params.address,
      serviceSummary: params.serviceSummary,
      beforePhotoUrls: params.beforePhotoUrls,
      afterPhotoUrls: params.afterPhotoUrls,
      upgradeNotes: params.upgradeNotes ?? null,
      portalUrl,
      reportUrl,
    }),
  })

  if (error) {
    throw new Error(error.message)
  }

  return { id: data?.id ?? '' }
}

export interface MembershipWelcomeEmailParams {
  to: string
  customerName: string
  plan: 'annual' | 'monthly'
  renewalDate: string
  bookUrl?: string
  portalUrl?: string
}

export async function sendMembershipWelcomeEmail(
  params: MembershipWelcomeEmailParams
): Promise<SendEmailResult> {
  const resend = getResendClient()
  const appUrl = getAppUrl()
  const planLabel =
    params.plan === 'annual' ? 'Storm Ready — Annual' : 'Storm Ready — Monthly'
  const planPrice =
    params.plan === 'annual' ? formatCurrency(249) : `${formatCurrency(24)}/mo`

  const { data, error } = await resend.emails.send({
    from: getFromEmail(),
    to: params.to,
    subject: 'Welcome to Storm Ready — your membership is active',
    react: MembershipWelcomeEmail({
      customerName: params.customerName,
      planLabel,
      planPrice,
      renewalDate: params.renewalDate,
      visitsPerYear: 2,
      bookUrl: params.bookUrl ?? `${appUrl}/book`,
      portalUrl: params.portalUrl ?? `${appUrl}/membership`,
    }),
  })

  if (error) {
    throw new Error(error.message)
  }

  return { id: data?.id ?? '' }
}

export interface MembershipReceiptEmailParams {
  to: string
  customerName: string
  plan: 'annual' | 'monthly'
  amount: number
  paymentDate: string
  renewalDate: string
  portalUrl?: string
}

export async function sendMembershipReceiptEmail(
  params: MembershipReceiptEmailParams
): Promise<SendEmailResult> {
  const resend = getResendClient()
  const appUrl = getAppUrl()
  const planLabel =
    params.plan === 'annual' ? 'Storm Ready — Annual' : 'Storm Ready — Monthly'

  const { data, error } = await resend.emails.send({
    from: getFromEmail(),
    to: params.to,
    subject: `Storm Ready receipt — ${formatCurrency(params.amount)}`,
    react: MembershipReceiptEmail({
      customerName: params.customerName,
      planLabel,
      amount: formatCurrency(params.amount),
      paymentDate: params.paymentDate,
      renewalDate: params.renewalDate,
      portalUrl: params.portalUrl ?? `${appUrl}/membership`,
    }),
  })

  if (error) {
    throw new Error(error.message)
  }

  return { id: data?.id ?? '' }
}
