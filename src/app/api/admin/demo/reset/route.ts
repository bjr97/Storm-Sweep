import { requireRole } from '@/lib/auth/requireRole'
import { resetDemoData } from '@/lib/demoSeed'

// Admin: wipe and rebuild the demo customer, demo Sweeper and their sample visits.
export async function POST(): Promise<Response> {
  try {
    const auth = await requireRole('admin')
    if (!auth.authorized) return Response.json({ error: 'Not authorized' }, { status: auth.status })
    await resetDemoData()
    return Response.json({ data: { ok: true }, message: 'Demo data reset' })
  } catch (error) {
    console.error('[admin/demo/reset]', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
