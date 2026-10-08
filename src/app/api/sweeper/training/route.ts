import { z } from 'zod'

import { requireRole } from '@/lib/auth/requireRole'
import { createServiceClient } from '@/lib/supabase/server'
import { allModulesRead, gradeQuiz, parseProgress, TRAINING_MODULES } from '@/lib/sweepers/training'

// Sweeper onboarding: mark a module read, or submit the quiz (graded here, never in the browser).
const bodySchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('read'), module: z.enum(TRAINING_MODULES.map((m) => m.id) as [string, ...string[]]) }),
  z.object({ action: z.literal('quiz'), answers: z.array(z.number().int().min(0).max(9)).max(20) }),
])

export async function POST(req: Request): Promise<Response> {
  try {
    const auth = await requireRole('sweeper')
    if (!auth.authorized) return Response.json({ error: 'Not authorized' }, { status: auth.status })
    const parsed = bodySchema.safeParse(await req.json())
    if (!parsed.success) return Response.json({ error: 'Invalid input' }, { status: 400 })

    const supabase = createServiceClient()
    const { data: me, error } = await supabase.from('profiles').select('training_progress, training_completed_at').eq('id', auth.userId).single()
    if (error) throw error
    const progress = parseProgress(me.training_progress)

    if (parsed.data.action === 'read') {
      if (!progress.read.includes(parsed.data.module)) progress.read.push(parsed.data.module)
      const { error: upErr } = await supabase.from('profiles').update({ training_progress: progress }).eq('id', auth.userId)
      if (upErr) throw upErr
      return Response.json({ data: { read: progress.read } })
    }

    if (!allModulesRead(progress)) {
      return Response.json({ error: 'Read every section before taking the quiz', code: 'MODULES_UNREAD' }, { status: 409 })
    }
    const result = gradeQuiz(parsed.data.answers)
    if (result.passed && !me.training_completed_at) {
      const { error: upErr } = await supabase.from('profiles').update({ training_completed_at: new Date().toISOString() }).eq('id', auth.userId)
      if (upErr) throw upErr
    }
    return Response.json({ data: result })
  } catch (error) {
    console.error('[sweeper/training]', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
