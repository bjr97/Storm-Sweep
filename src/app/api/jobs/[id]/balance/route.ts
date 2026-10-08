import { z } from 'zod'

import { balanceDue } from '@/lib/admin/balance'
import { requireRole } from '@/lib/auth/requireRole'
import { notifyBalancePaid } from '@/lib/notify'
import { createServiceClient } from '@/lib/supabase/server'

// Admin records that the remaining balance was collected (outside the app).
const bodySchema = z.object({
  method: z.enum(['zelle', 'venmo', 'cash_app', 'check', 'cash', 'card', 'other']),
  reference: z.string().trim().max(100).nullable().optional(),
  notify: z.boolean().default(true),
})
const paramsSchema = z.object({ id: z.string().uuid() })

export async function POST(req: Request, { params }: { params: { id: string } }): Promise<Response> {
  try {
    const auth = await requireRole('admin')
    if (!auth.authorized) return Response.json({ error: 'Not authorized' }, { status: auth.status })
    const p = paramsSchema.safeParse(params)
    const b = bodySchema.safeParse(await req.json())
    if (!p.success || !b.success) return Response.json({ error: 'Invalid input' }, { status: 400 })

    const supabase = createServiceClient()
    const { data: job } = await supabase.from('jobs').select('*').eq('id', p.data.id).maybeSingle()
    if (!job) return Response.json({ error: 'Job not found' }, { status: 404 })
    const due = balanceDue(job)
    if (due <= 0) return Response.json({ error: 'Nothing is owed on this visit', code: 'NOTHING_DUE' }, { status: 409 })

    const { data: updated, error } = await supabase
      .from('jobs')
      .update({ payment_status: 'paid', balance_paid_at: new Date().toISOString(), balance_method: b.data.method, balance_reference: b.data.reference || null })
      .eq('id', job.id)
      .neq('payment_status', 'paid')
      .select('id')
    if (error) throw error
    if (!updated?.length) return Response.json({ error: 'Already marked paid', code: 'NOTHING_DUE' }, { status: 409 })

    if (b.data.notify) await notifyBalancePaid(job.id, due)
    return Response.json({ data: { collected: due } })
  } catch (error) {
    console.error('[jobs/balance]', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
