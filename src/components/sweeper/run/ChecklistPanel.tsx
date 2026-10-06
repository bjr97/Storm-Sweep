'use client'

import { Check, Lock } from 'lucide-react'
import { useState } from 'react'

import { PhotoButton } from '@/components/sweeper/run/PhotoButton'
import { postRunAction } from '@/components/sweeper/run/useRunAction'
import { PHASE_LABEL, PHOTO_ITEM_TYPE } from '@/lib/sweepers/jobRun'
import { cn } from '@/lib/utils'

export type ChecklistRow = {
  id: string
  phase: number
  label: string
  required: boolean
  done: boolean
  /** manual = tick by hand; photo = done by uploading; auto = done by the app. */
  mode: 'manual' | 'photo' | 'auto'
  thumbUrl: string | null
}

/** Grouped checklist. Manual ticks update optimistically and roll back on error. */
export function ChecklistPanel({ jobId, rows, locked }: { jobId: string; rows: ChecklistRow[]; locked: boolean }): React.ReactElement {
  const [done, setDone] = useState<Record<string, boolean>>(() => Object.fromEntries(rows.map((r) => [r.id, r.done])))
  const [error, setError] = useState<string | null>(null)

  async function toggle(id: string, next: boolean): Promise<void> {
    setDone((d) => ({ ...d, [id]: next }))
    setError(null)
    const res = await postRunAction(jobId, { action: 'checklist', itemId: id, done: next })
    if (!res.ok) {
      setDone((d) => ({ ...d, [id]: !next }))
      setError(res.error)
    }
  }

  const phases = Array.from(new Set(rows.map((r) => r.phase)))
  return (
    <div className="space-y-5">
      {error ? <p role="alert" className="text-sm font-semibold text-[#F1948A]">{error}</p> : null}
      {phases.map((phase) => {
        const items = rows.filter((r) => r.phase === phase)
        const count = items.filter((r) => (r.mode === 'manual' ? done[r.id] : r.done)).length
        return (
          <section key={phase} aria-labelledby={`phase-${phase}`}>
            <h3 id={`phase-${phase}`} className="mb-2 flex items-baseline justify-between text-xs font-bold uppercase tracking-[0.18em] text-[#8A8A8F]">
              <span>{phase}. {PHASE_LABEL[phase]}</span>
              <span>{count}/{items.length}</span>
            </h3>
            <ul className="divide-y divide-white/[0.06] overflow-hidden rounded-xl border border-white/[0.07] bg-[#1C1C1F]">
              {items.map((r) => {
                const isDone = r.mode === 'manual' ? Boolean(done[r.id]) : r.done
                return (
                  <li key={r.id} className="flex items-center gap-3 px-3 py-3">
                    {r.mode === 'manual' ? (
                      <input
                        type="checkbox"
                        id={`item-${r.id}`}
                        checked={isDone}
                        disabled={locked}
                        onChange={(e) => void toggle(r.id, e.target.checked)}
                        className="size-6 shrink-0 accent-sky"
                      />
                    ) : (
                      <span
                        className={cn(
                          'flex size-6 shrink-0 items-center justify-center rounded-md border',
                          isDone ? 'border-sky bg-sky text-white' : 'border-white/20 text-[#5A5A5F]'
                        )}
                        aria-label={isDone ? 'Done' : 'Not done'}
                      >
                        {isDone ? <Check className="size-4" aria-hidden="true" /> : r.mode === 'auto' ? <Lock className="size-3" aria-hidden="true" /> : null}
                      </span>
                    )}
                    <label htmlFor={r.mode === 'manual' ? `item-${r.id}` : undefined} className={cn('min-w-0 flex-1 text-sm', isDone ? 'text-[#8A8A8F] line-through' : 'text-[#F0F0F0]')}>
                      {r.label}
                      {r.required ? null : <span className="ml-1 text-[10px] font-semibold uppercase text-[#5A5A5F] no-underline">optional</span>}
                    </label>
                    {r.mode === 'photo' ? (
                      r.thumbUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- signed storage URL
                        <img src={r.thumbUrl} alt="" className="size-10 shrink-0 rounded-md object-cover" />
                      ) : (
                        <PhotoButton jobId={jobId} kind={PHOTO_ITEM_TYPE[r.id]} checklistItem={r.id} label="Photo" disabled={locked} />
                      )
                    ) : null}
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
