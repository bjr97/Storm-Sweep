import { z } from 'zod'

import { requireRole } from '@/lib/auth/requireRole'
import { HELP_TOPIC_VALUES } from '@/lib/help'
import { notifyHelpRequest } from '@/lib/notify'
import { createServiceClient } from '@/lib/supabase/server'

// Customer "Need help?": save the request, then text + email the office (best-effort).
const bodySchema = z.object({
  topic: z.enum(HELP_TOPIC_VALUES),
  message: z.string().trim().min(1, 'Tell us how we can help').max(2000),
  jobId: z.string().uuid().nullable().optional(),
})

export async function POST(req: Request): Promise<Response> {
  try {
    const auth = await requireRole('customer')
    if (!auth.authorized) return Response.json({ error: 'Please sign in' }, { status: auth.status })
    const parsed = bodySchema.safeParse(await req.json())
    if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })

    const supabase = createServiceClient()
    let jobId: string | null = null
    if (parsed.data.jobId) {
      // Only attach the customer's own visit.
      const { data: job } = await supabase.from('jobs').select('id').eq('id', parsed.data.jobId).eq('customer_id', auth.userId).maybeSingle()
      if (!job) return Response.json({ error: 'Visit not found' }, { status: 404 })
      jobId = job.id
    }
    const { data, error } = await supabase
      .from('help_requests')
      .insert({ customer_id: auth.userId, job_id: jobId, topic: parsed.data.topic, message: parsed.data.message })
      .select('id')
      .single()
    if (error) throw error
    await notifyHelpRequest(data.id)
    return Response.json({ data: { id: data.id }, message: 'Thanks — we’ll get back to you soon' })
  } catch (error) {
    console.error('[customer/help]', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
