import { createServiceClient } from '@/lib/supabase/server'

type DocuSealWebhookPayload = {
  event_type?: string
  data?: {
    submitters?: Array<{
      external_id?: string | null
      email?: string
      status?: string
    }>
    documents?: Array<{
      url?: string
    }>
  }
}

export async function POST(req: Request): Promise<Response> {
  try {
    const webhookSecret = process.env.DOCUSEAL_WEBHOOK_SECRET
    if (webhookSecret) {
      const signature = req.headers.get('x-docuseal-signature')
      if (signature !== webhookSecret) {
        return Response.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    const payload = (await req.json()) as DocuSealWebhookPayload
    const eventType = payload.event_type

    if (eventType !== 'form.completed' && eventType !== 'submission.completed') {
      return Response.json({ data: { ignored: true } })
    }

    const submitter = payload.data?.submitters?.find(
      (s) => s.status === 'completed' || s.status === 'signed'
    ) ?? payload.data?.submitters?.[0]

    const applicantId = submitter?.external_id
    const documentUrl = payload.data?.documents?.[0]?.url ?? null

    if (!applicantId) {
      console.warn('[docuseal/webhook] No external_id on submitter')
      return Response.json({ data: { ignored: true } })
    }

    const supabase = createServiceClient()
    const { error } = await supabase
      .from('sweeper_applicants')
      .update({
        agreement_signed: true,
        agreement_pdf_path: documentUrl,
      })
      .eq('id', applicantId)

    if (error) {
      console.error('[docuseal/webhook]', error)
      return Response.json({ error: 'Failed to update applicant' }, { status: 500 })
    }

    return Response.json({ data: { applicantId, agreement_signed: true } })
  } catch (error) {
    console.error('[docuseal/webhook]', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
