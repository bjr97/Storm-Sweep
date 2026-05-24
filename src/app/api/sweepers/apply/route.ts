import { createServiceClient } from '@/lib/supabase/server'
import { renderSmsTemplate, sendSms } from '@/lib/twilio'
import { sweeperApplySchema } from '@/lib/sweepers/schemas'
import { normalizePhone } from '@/lib/sweepers/utils'
import type { SweeperApplicant } from '@/types/database'

export async function POST(req: Request): Promise<Response> {
  try {
    const body: unknown = await req.json()
    const parsed = sweeperApplySchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()
    const input = parsed.data

    const { data: existing } = await supabase
      .from('sweeper_applicants')
      .select('id, status')
      .eq('email', input.email.toLowerCase())
      .maybeSingle()

    if (existing?.status === 'pending') {
      return Response.json({
        data: { id: existing.id },
        message: 'Application already in progress',
      })
    }

    if (existing?.status === 'approved') {
      return Response.json(
        { error: 'An account already exists for this email', code: 'ALREADY_APPROVED' },
        { status: 409 }
      )
    }

    if (existing?.status === 'rejected') {
      const { data: applicant, error } = await supabase
        .from('sweeper_applicants')
        .update({
          full_name: input.full_name,
          phone: normalizePhone(input.phone),
          availability: input.availability,
          has_vehicle: input.has_vehicle,
          experience_notes: input.experience_notes ?? null,
          heard_about: input.heard_about,
          status: 'pending',
          tool_photos: {},
          all_tools_verified: false,
          agreement_signed: false,
          agreement_pdf_path: null,
          admin_notes: null,
          profile_id: null,
          approved_at: null,
          applied_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select('*')
        .single()

      if (error || !applicant) {
        console.error('[sweepers/apply]', error)
        return Response.json({ error: 'Failed to update application' }, { status: 500 })
      }

      await notifyAdminNewApplication(applicant)

      return Response.json({
        data: { id: applicant.id },
        message: 'Application resubmitted',
      })
    }

    const { data: applicant, error } = await supabase
      .from('sweeper_applicants')
      .insert({
        full_name: input.full_name,
        email: input.email.toLowerCase(),
        phone: normalizePhone(input.phone),
        availability: input.availability,
        has_vehicle: input.has_vehicle,
        experience_notes: input.experience_notes ?? null,
        heard_about: input.heard_about,
      })
      .select('*')
      .single()

    if (error || !applicant) {
      console.error('[sweepers/apply]', error)
      return Response.json({ error: 'Failed to create application' }, { status: 500 })
    }

    await notifyAdminNewApplication(applicant)

    return Response.json({
      data: { id: applicant.id },
      message: 'Application created',
    })
  } catch (error) {
    console.error('[sweepers/apply]', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(req: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(req.url)
    const applicantId = searchParams.get('applicantId')

    if (!applicantId) {
      return Response.json({ error: 'applicantId is required' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const { data: applicant, error } = await supabase
      .from('sweeper_applicants')
      .select(
        'id, full_name, email, phone, availability, has_vehicle, heard_about, experience_notes, tool_photos, all_tools_verified, agreement_signed, status, applied_at'
      )
      .eq('id', applicantId)
      .single()

    if (error || !applicant) {
      return Response.json({ error: 'Application not found' }, { status: 404 })
    }

    return Response.json({ data: applicant })
  } catch (error) {
    console.error('[sweepers/apply GET]', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function notifyAdminNewApplication(applicant: SweeperApplicant): Promise<void> {
  const adminPhone = process.env.ADMIN_PHONE_NUMBER
  if (!adminPhone) {
    console.warn('[sweepers/apply] ADMIN_PHONE_NUMBER not set — skipping admin alert')
    return
  }

  const body = renderSmsTemplate('sweeper_application_admin', {
    name: applicant.full_name,
    email: applicant.email,
    phone: applicant.phone,
  })

  await sendSms({
    to: adminPhone,
    body,
    trigger: 'sweeper_application_admin',
  }).catch((err: unknown) => {
    console.error('[sweepers/apply] admin SMS failed', err)
  })
}
