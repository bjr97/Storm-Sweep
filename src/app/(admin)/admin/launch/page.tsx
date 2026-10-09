import { CheckCircle2, Circle, Clock, TriangleAlert } from 'lucide-react'

import { AdminTopbar } from '@/components/admin/AdminTopbar'
import { LaunchSectionList, type LaunchItem } from '@/components/admin/LaunchSection'
import { Panel } from '@/components/admin/Panel'
import { ensureLaunchSeeded, getAutoChecks, LAUNCH_DATE, LAUNCH_SECTIONS, listLaunchTasks, type AutoCheck } from '@/lib/admin/launch'
import { localDate, localMidnight } from '@/lib/admin/time'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Launch checklist · Storm Sweep Admin' }

const STATUS: Record<AutoCheck['status'], { icon: typeof CheckCircle2; className: string; label: string }> = {
  ok: { icon: CheckCircle2, className: 'text-[#2ECC71]', label: 'Done' },
  warn: { icon: TriangleAlert, className: 'text-wheat-light', label: 'Optional / check' },
  missing: { icon: Circle, className: 'text-[#F1948A]', label: 'To do' },
  later: { icon: Clock, className: 'text-[#8A8A8F]', label: 'Later' },
}

function Progress({ done, total }: { done: number; total: number }): React.ReactElement {
  return (
    <progress
      value={done}
      max={Math.max(total, 1)}
      aria-label={`${done} of ${total} done`}
      className="block h-1.5 w-full appearance-none overflow-hidden rounded-full bg-white/[0.08] [&::-moz-progress-bar]:bg-[#27AE60] [&::-webkit-progress-bar]:bg-white/[0.08] [&::-webkit-progress-value]:bg-[#27AE60]"
    />
  )
}

export default async function LaunchChecklistPage(): Promise<React.ReactElement> {
  await ensureLaunchSeeded()
  const [tasks, checks] = await Promise.all([listLaunchTasks(), getAutoChecks()])

  const t = localDate(new Date())
  const today = `${t.year}-${String(t.month).padStart(2, '0')}-${String(t.day).padStart(2, '0')}`
  const [ly, lm, ld] = LAUNCH_DATE.split('-').map(Number)
  const daysLeft = Math.round((localMidnight(ly, lm, ld).getTime() - localMidnight(t.year, t.month, t.day).getTime()) / 86_400_000)

  const items = (section: string): LaunchItem[] =>
    tasks
      .filter((x) => x.section === section)
      .map((x) => ({ id: x.id, title: x.title, notes: x.notes, link: x.link, dueOn: x.due_on, done: Boolean(x.done_at), overdue: Boolean(x.due_on && !x.done_at && x.due_on < today) }))

  const autoDone = checks.filter((c) => c.status === 'ok').length
  const autoCounted = checks.filter((c) => c.status !== 'later').length
  const manualDone = tasks.filter((x) => x.done_at).length
  const done = manualDone + autoDone
  const total = tasks.length + autoCounted

  return (
    <>
      <AdminTopbar title="Launch checklist" subtitle={`${done} of ${total} done · ${daysLeft > 0 ? `${daysLeft} days to launch (Nov 15)` : daysLeft === 0 ? 'Launch day!' : 'Launched'}`} />
      <main className="flex-1 space-y-4 overflow-y-auto px-4 py-6 sm:px-7">
        <section aria-label="Overall progress" className="space-y-2 rounded-xl border border-white/[0.07] bg-[#1C1C1F] p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-[family-name:var(--font-bebas)] text-3xl tracking-wide text-white">
              {daysLeft > 0 ? `${daysLeft} days to go` : daysLeft === 0 ? 'Launch day' : 'Launched'}
            </p>
            <p className="text-sm text-[#C9C9CE]">
              {Math.round((done / Math.max(total, 1)) * 100)}% ready · {done}/{total}
            </p>
          </div>
          <Progress done={done} total={total} />
          <p className="text-[11px] text-[#8A8A8F]">
            Website connections are checked automatically. Everything else you tick off yourself, and you can add, edit or delete any item.
          </p>
        </section>

        <Panel title="Website connections" subtitle={`Checked automatically · ${autoDone}/${autoCounted}`}>
          <ul className="space-y-2.5">
            {checks.map((c) => {
              const s = STATUS[c.status]
              return (
                <li key={c.id} className="flex items-start gap-2.5">
                  <s.icon className={cn('mt-0.5 size-4 shrink-0', s.className)} aria-label={s.label} />
                  <div className="min-w-0">
                    <p className="text-[13px] text-[#F0F0F0]">{c.label}</p>
                    <p className="text-[11px] leading-relaxed text-[#9A9A9F]">{c.detail}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        </Panel>

        <div className="grid gap-4 xl:grid-cols-2">
          {LAUNCH_SECTIONS.map((s) => {
            const list = items(s.id)
            const d = list.filter((x) => x.done).length
            return (
              <Panel key={s.id} title={s.title} subtitle={`${d}/${list.length} done`}>
                <div className="space-y-3">
                  <Progress done={d} total={list.length} />
                  <LaunchSectionList section={s.id} items={list} />
                </div>
              </Panel>
            )
          })}
        </div>
      </main>
    </>
  )
}
