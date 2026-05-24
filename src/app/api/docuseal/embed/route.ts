import { createServiceClient } from '@/lib/supabase/server'

type DocuSealSubmissionResponse = {
  submitters?: Array<{
    embed_src?: string
    slug?: string
  }>
}

export async function GET(req: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(req.url)
    const applicantId = searchParams.get('applicantId')

    if (!applicantId) {
      return Response.json({ error: 'applicantId is required' }, { status: 400 })
    }

    const apiKey = process.env.DOCUSEAL_API_KEY
    const templateId = process.env.DOCUSEAL_IC_TEMPLATE_ID

    if (!apiKey || !templateId) {
      return Response.json(
        { error: 'DocuSeal is not configured', code: 'DOCUSEAL_NOT_CONFIGURED' },
        { status: 503 }
      )
    }

    const supabase = createServiceClient()
    const { data: applicant, error } = await supabase
      .from('sweeper_applicants')
      .select('id, full_name, email, agreement_signed')
      .eq('id', applicantId)
      .single()

    if (error || !applicant) {
      return Response.json({ error: 'Application not found' }, { status: 404 })
    }

    if (applicant.agreement_signed) {
      return Response.json({
        data: { signed: true, embedSrc: null },
      })
    }

    const response = await fetch('https://api.docuseal.com/submissions', {
      method: 'POST',
      headers: {
        'X-Auth-Token': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        template_id: Number.isNaN(Number(templateId)) ? templateId : Number(templateId),
        send_email: false,
        submitters: [
          {
            name: applicant.full_name,
            email: applicant.email,
            external_id: applicant.id,
            role: 'First Party',
          },
        ],
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('[docuseal/embed]', response.status, errText)
      return Response.json({ error: 'Failed to create signing session' }, { status: 502 })
    }

    const result = (await response.json()) as DocuSealSubmissionResponse
    const embedSrc = result.submitters?.[0]?.embed_src

    if (!embedSrc) {
      return Response.json({ error: 'No embed URL returned from DocuSeal' }, { status: 502 })
    }

    return Response.json({
      data: { signed: false, embedSrc },
    })
  } catch (error) {
    console.error('[docuseal/embed]', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
