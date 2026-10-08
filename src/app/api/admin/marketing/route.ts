import { z } from 'zod'

import { consentedJobIds, defaultCaption } from '@/lib/admin/marketing'
import { parseServiceAddress } from '@/lib/booking/address'
import { requireRole } from '@/lib/auth/requireRole'
import { createClient } from '@/lib/supabase/server'

// Draft a social post from a visit whose photos the customer opted in to share.
const bodySchema = z.object({
  jobId: z.string().uuid(),
  platform: z.enum(['tiktok', 'instagram', 'facebook']),
})

export async function POST(req: Request): Promise<Response> {
  try {
    const auth = await requireRole('admin')
    if (!auth.authorized) return Response.json({ error: 'Not authorized' }, { status: auth.status })
    const parsed = bodySchema.safeParse(await req.json())
    if (!parsed.success) return Response.json({ error: 'Invalid input' }, { status: 400 })
    const { jobId, platform } = parsed.data

    if (!(await consentedJobIds([jobId])).has(jobId)) {
      return Response.json({ error: 'The customer hasn’t allowed these photos to be shared', code: 'NO_CONSENT' }, { status: 409 })
    }
    const supabase = createClient()
    const { data: job } = await supabase.from('jobs').select('address, shelter_size').eq('id', jobId).maybeSingle()
    if (!job) return Response.json({ error: 'Visit not found' }, { status: 404 })

    const { data, error } = await supabase
      .from('social_posts')
      .insert({
        job_id: jobId,
        platform,
        caption: defaultCaption(parseServiceAddress(job.address).city || 'Norman', job.shelter_size),
        customer_consent: true,
      })
      .select('id')
      .single()
    if (error) throw error
    return Response.json({ data })
  } catch (error) {
    console.error('[admin/marketing]', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
