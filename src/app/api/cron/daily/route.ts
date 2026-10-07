import { requireRole } from '@/lib/auth/requireRole'
import { runDailyAutomations } from '@/lib/automation/daily'

// Vercel Cron calls GET daily (vercel.json). If CRON_SECRET is set in Vercel,
// requests must carry it (Vercel adds "Authorization: Bearer <CRON_SECRET>").
// Without it the endpoint still can't spam anyone: every text is sent once.
export async function GET(req: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'Not authorized' }, { status: 401 })
  }
  return run()
}

// Admin "run now" (e.g. to check what would go out today).
export async function POST(): Promise<Response> {
  const auth = await requireRole('admin')
  if (!auth.authorized) return Response.json({ error: 'Not authorized' }, { status: auth.status })
  return run()
}

async function run(): Promise<Response> {
  try {
    const result = await runDailyAutomations()
    console.log('[cron/daily]', JSON.stringify(result))
    return Response.json({ data: result })
  } catch (error) {
    console.error('[cron/daily]', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
