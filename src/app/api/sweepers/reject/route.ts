import { requireRole } from '@/lib/auth/requireRole'
import { createServiceClient } from '@/lib/supabase/server'
import { sweeperRejectSchema } from '@/lib/sweepers/schemas'
import { renderSmsTemplate, sendSms } from '@/lib/twilio'

export async function POST(req: Request): Promise<Response> {
  try {
    const auth = await requireRole('admin')
    if (!auth.authorized) {
      return Response.json({ error: 'Unauthorized' }, { status: auth.status })
    }

    const body: unknown = await req.json()
    const parsed = sweeperRejectSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()
    const { applicantId, adminNotes } = parsed.data

    const { data: applicant, error: fetchError } = await supabase
      .from('sweeper_applicants')
      .select('*')
      .eq('id', applicantId)
      .single()

    if (fetchError || !applicant) {
      return Response.json({ error: 'Applicant not found' }, { status: 404 })
    }

    if (applicant.status === 'rejected') {
      return Response.json({ message: 'Applicant already rejected' })
    }

    if (applicant.status === 'approved') {
      return Response.json(
        { error: 'Cannot reject an approved applicant', code: 'ALREADY_APPROVED' },
        { status: 409 }
      )
    }

    const { error: updateError } = await supabase
      .from('sweeper_applicants')
      .update({
        status: 'rejected',
        admin_notes: adminNotes ?? applicant.admin_notes,
      })
      .eq('id', applicantId)

    if (updateError) {
      console.error('[sweepers/reject]', updateError)
      return Response.json({ error: 'Failed to update applicant' }, { status: 500 })
    }

    const body_text = renderSmsTemplate('sweeper_declined', {
      name: applicant.full_name,
    })

    await sendSms({
      to: applicant.phone,
      body: body_text,
      trigger: 'sweeper_declined',
    }).catch((err: unknown) => {
      console.error('[sweepers/reject] decline SMS failed', err)
    })

    return Response.json({
      data: { applicantId },
      message: 'Applicant rejected and decline SMS sent',
    })
  } catch (error) {
    console.error('[sweepers/reject]', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
