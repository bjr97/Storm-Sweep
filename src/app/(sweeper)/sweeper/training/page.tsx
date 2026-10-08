import { TrainingCourse } from '@/components/sweeper/TrainingCourse'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { parseProgress, TRAINING_MODULES } from '@/lib/sweepers/training'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Training · Storm Sweep' }

export default async function SweeperTrainingPage(): Promise<React.ReactElement> {
  const {
    data: { user },
  } = await createClient().auth.getUser()
  const { data: me } = await createServiceClient()
    .from('profiles')
    .select('training_progress, training_completed_at, training_waived')
    .eq('id', user!.id)
    .single()
  const progress = parseProgress(me?.training_progress)
  const completed = Boolean(me?.training_completed_at) || Boolean(me?.training_waived)
  const minutes = TRAINING_MODULES.reduce((n, m) => n + m.minutes, 0)

  return (
    <main className="space-y-4 px-4 pt-5">
      <div>
        <h1 className="font-[family-name:var(--font-bebas)] text-3xl tracking-wide text-white">Sweeper training</h1>
        <p className="text-xs text-[#9A9A9F]">
          {completed
            ? 'You’re all set. Come back anytime for a refresher.'
            : `About ${minutes} minutes. Read each section, then pass a short quiz to start claiming jobs.`}
        </p>
      </div>
      <TrainingCourse initialRead={progress.read} completed={completed} />
    </main>
  )
}
