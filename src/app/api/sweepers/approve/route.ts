import { requireRole } from '@/lib/auth/requireRole'
import { createServiceClient } from '@/lib/supabase/server'
import { sweeperApproveSchema } from '@/lib/sweepers/schemas'
import { generateTempPassword } from '@/lib/sweepers/utils'
import { getAppUrl, renderSmsTemplate, sendSms } from '@/lib/twilio'

export async function POST(req: Request): Promise<Response> {
  try {
    const auth = await requireRole('admin')
    if (!auth.authorized) {
      return Response.json({ error: 'Unauthorized' }, { status: auth.status })
    }

    const body: unknown = await req.json()
    const parsed = sweeperApproveSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()
    const { applicantId } = parsed.data

    const { data: applicant, error: fetchError } = await supabase
      .from('sweeper_applicants')
      .select('*')
      .eq('id', applicantId)
      .single()

    if (fetchError || !applicant) {
      return Response.json({ error: 'Applicant not found' }, { status: 404 })
    }

    if (applicant.status === 'approved') {
      return Response.json(
        { error: 'Applicant already approved', code: 'ALREADY_APPROVED' },
        { status: 409 }
      )
    }

    if (!applicant.all_tools_verified) {
      return Response.json(
        { error: 'All tool photos must be verified first', code: 'TOOLS_INCOMPLETE' },
        { status: 422 }
      )
    }

    if (!applicant.agreement_signed) {
      return Response.json(
        { error: 'IC agreement must be signed first', code: 'AGREEMENT_UNSIGNED' },
        { status: 422 }
      )
    }

    const tempPassword = generateTempPassword()
    const appUrl = getAppUrl()

    const { data: authUser, error: createError } = await supabase.auth.admin.createUser({
      email: applicant.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: applicant.full_name,
        phone: applicant.phone,
      },
    })

    if (createError || !authUser.user) {
      console.error('[sweepers/approve]', createError)
      if (createError?.code === 'email_exists' || /already (been )?registered/i.test(createError?.message ?? '')) {
        return Response.json(
          {
            error: `An account already exists for ${applicant.email}. Change that account's role to sweeper instead.`,
            code: 'EMAIL_IN_USE',
          },
          { status: 409 }
        )
      }
      return Response.json({ error: 'Failed to create user account' }, { status: 500 })
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        role: 'sweeper',
        full_name: applicant.full_name,
        phone: applicant.phone,
      })
      .eq('id', authUser.user.id)

    if (profileError) {
      console.error('[sweepers/approve] profile update', profileError)
      await supabase.auth.admin.deleteUser(authUser.user.id)
      return Response.json({ error: 'Failed to configure sweeper profile' }, { status: 500 })
    }

    const { error: applicantError } = await supabase
      .from('sweeper_applicants')
      .update({
        status: 'approved',
        profile_id: authUser.user.id,
        approved_at: new Date().toISOString(),
      })
      .eq('id', applicantId)

    if (applicantError) {
      console.error('[sweepers/approve] applicant update', applicantError)
      return Response.json({ error: 'Failed to update applicant record' }, { status: 500 })
    }

    const loginUrl = `${appUrl}/login`
    const smsBody = renderSmsTemplate('sweeper_welcome', {
      name: applicant.full_name,
      loginUrl,
      tempPassword,
    })

    let smsSent = true
    try {
      await sendSms({
        to: applicant.phone,
        body: smsBody,
        trigger: 'sweeper_welcome',
        profileId: authUser.user.id,
      })
    } catch (err) {
      smsSent = false
      console.error('[sweepers/approve] welcome SMS failed', err)
    }

    return Response.json({
      data: {
        profileId: authUser.user.id,
        applicantId,
        loginUrl,
        smsSent,
        // Only when the SMS failed: the admin must relay the login manually,
        // otherwise the new Sweeper has no way to sign in. Shown once, never stored.
        ...(smsSent ? {} : { tempPassword }),
      },
      message: smsSent
        ? 'Sweeper approved and welcome SMS sent'
        : 'Sweeper approved — welcome SMS could not be sent; share the temporary password manually',
    })
  } catch (error) {
    console.error('[sweepers/approve]', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
