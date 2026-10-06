import { z } from 'zod'

import { createServiceClient } from '@/lib/supabase/server'
import { namesMatch } from '@/lib/sweepers/agreement'
import { buildSignedAgreementPdf } from '@/lib/sweepers/agreementPdf'

// Public (applicants have no account yet), keyed by the unguessable applicant
// UUID from their application session — same model as /api/sweepers/apply.
const signSchema = z.object({
  applicantId: z.string().uuid(),
  legalName: z.string().trim().min(2).max(120),
  agreed: z.literal(true),
})

function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  return forwarded?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'
}

export async function POST(req: Request): Promise<Response> {
  try {
    const parsed = signSchema.safeParse(await req.json())
    if (!parsed.success) {
      return Response.json(
        { error: 'Please check the agreement box and type your full legal name', details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const { applicantId, legalName } = parsed.data

    const supabase = createServiceClient()
    const { data: applicant, error } = await supabase
      .from('sweeper_applicants')
      .select('id, full_name, email, phone, status, agreement_signed')
      .eq('id', applicantId)
      .maybeSingle()

    if (error) throw error
    if (!applicant) return Response.json({ error: 'Application not found' }, { status: 404 })
    if (applicant.agreement_signed) {
      return Response.json({ error: 'This agreement is already signed', code: 'ALREADY_SIGNED' }, { status: 409 })
    }
    if (applicant.status !== 'pending') {
      return Response.json({ error: 'This application is no longer open', code: 'NOT_PENDING' }, { status: 409 })
    }
    if (!namesMatch(legalName, applicant.full_name)) {
      return Response.json(
        { error: 'Type your full legal name exactly as it appears on your application', code: 'NAME_MISMATCH' },
        { status: 400 }
      )
    }

    const signedAt = new Date()
    const pdf = await buildSignedAgreementPdf({
      applicantId,
      legalName,
      email: applicant.email,
      phone: applicant.phone,
      signedAt,
      ipAddress: clientIp(req),
      userAgent: req.headers.get('user-agent') ?? 'unknown',
    })

    const path = `ic-agreements/${applicantId}/${signedAt.getTime()}.pdf`
    const { error: uploadError } = await supabase.storage
      .from('agreements')
      .upload(path, pdf, { contentType: 'application/pdf', upsert: false })
    if (uploadError) throw uploadError

    // Conditional update: a double-submit can't record two signatures.
    const { data: updated, error: updateError } = await supabase
      .from('sweeper_applicants')
      .update({ agreement_signed: true, agreement_pdf_path: path })
      .eq('id', applicantId)
      .eq('agreement_signed', false)
      .select('id')
    if (updateError) throw updateError
    if (!updated?.length) {
      await supabase.storage.from('agreements').remove([path])
      return Response.json({ error: 'This agreement is already signed', code: 'ALREADY_SIGNED' }, { status: 409 })
    }

    const { data: link } = await supabase.storage.from('agreements').createSignedUrl(path, 600)

    return Response.json({
      data: { signedAt: signedAt.toISOString(), downloadUrl: link?.signedUrl ?? null },
      message: 'Agreement signed',
    })
  } catch (error) {
    console.error('[sweepers/agreement]', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
