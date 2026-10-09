'use client'

import { Check, ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { cn } from '@/lib/utils'
import type { LaunchSection as SectionId } from '@/types/database'

export type LaunchItem = { id: string; title: string; notes: string | null; link: string | null; dueOn: string | null; done: boolean; overdue: boolean }

const field = 'h-8 w-full rounded-md border border-white/10 bg-[#0F0F11] px-2 text-xs text-[#F0F0F0]'

async function send(method: 'POST' | 'PATCH' | 'DELETE', url: string, body?: unknown): Promise<string | null> {
  try {
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
    return res.ok ? null : (((await res.json()) as { error?: string }).error ?? 'Something went wrong')
  } catch {
    return 'Could not reach the server'
  }
}

function Editor({
  initial,
  onSave,
  onCancel,
  saveLabel,
}: {
  initial: { title: string; notes: string; dueOn: string }
  onSave: (v: { title: string; notes: string; dueOn: string }) => Promise<void>
  onCancel: () => void
  saveLabel: string
}): React.ReactElement {
  const [v, setV] = useState(initial)
  const [busy, setBusy] = useState(false)
  return (
    <div className="space-y-2 rounded-md border border-white/10 bg-[#141416] p-2">
      <input value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} maxLength={200} placeholder="What needs doing?" className={field} aria-label="Title" />
      <textarea value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} maxLength={2000} rows={2} placeholder="Notes (optional)" className={cn(field, 'h-auto py-1.5')} aria-label="Notes" />
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-[11px] text-[#9A9A9F]">
          Due
          <input type="date" value={v.dueOn} onChange={(e) => setV({ ...v, dueOn: e.target.value })} className="ml-1.5 h-8 rounded-md border border-white/10 bg-[#0F0F11] px-2 text-xs text-[#F0F0F0]" />
        </label>
        <button
          type="button"
          disabled={busy || !v.title.trim()}
          onClick={async () => {
            setBusy(true)
            await onSave(v)
            setBusy(false)
          }}
          className="h-8 rounded-md bg-sky px-3 text-xs font-bold text-white hover:bg-sky-light disabled:opacity-50"
        >
          {busy ? 'Saving…' : saveLabel}
        </button>
        <button type="button" onClick={onCancel} className="h-8 px-2 text-xs text-[#9A9A9F]">
          Cancel
        </button>
      </div>
    </div>
  )
}

/** One checklist section: tick off, edit, delete and add items. */
export function LaunchSectionList({ section, items }: { section: SectionId; items: LaunchItem[] }): React.ReactElement {
  const router = useRouter()
  const [editing, setEditing] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<Set<string>>(new Set())

  const run = async (id: string, fn: () => Promise<string | null>): Promise<void> => {
    setPending((p) => new Set(p).add(id))
    const err = await fn()
    setError(err)
    setPending((p) => {
      const n = new Set(p)
      n.delete(id)
      return n
    })
    router.refresh()
  }

  return (
    <div className="space-y-1">
      <ul className="divide-y divide-white/[0.06]">
        {items.map((t) =>
          editing === t.id ? (
            <li key={t.id} className="py-2">
              <Editor
                initial={{ title: t.title, notes: t.notes ?? '', dueOn: t.dueOn ?? '' }}
                saveLabel="Save"
                onCancel={() => setEditing(null)}
                onSave={async (v) => {
                  await run(t.id, () => send('PATCH', `/api/admin/launch/${t.id}`, { title: v.title, notes: v.notes || null, dueOn: v.dueOn || null }))
                  setEditing(null)
                }}
              />
            </li>
          ) : (
            <li key={t.id} className={cn('group flex items-start gap-2.5 py-2', pending.has(t.id) && 'opacity-60')}>
              <button
                type="button"
                role="checkbox"
                aria-checked={t.done}
                aria-label={t.done ? `Mark "${t.title}" not done` : `Mark "${t.title}" done`}
                onClick={() => void run(t.id, () => send('PATCH', `/api/admin/launch/${t.id}`, { done: !t.done }))}
                className={cn(
                  'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border',
                  t.done ? 'border-[#2ECC71] bg-[#27AE60] text-white' : 'border-white/25 hover:border-sky'
                )}
              >
                {t.done ? <Check className="size-3.5" aria-hidden="true" /> : null}
              </button>
              <div className="min-w-0 flex-1">
                <p className={cn('text-[13px]', t.done ? 'text-[#8A8A8F] line-through' : 'text-[#F0F0F0]')}>
                  {t.title}
                  {t.dueOn && !t.done ? (
                    <span className={cn('ml-2 rounded px-1.5 py-0.5 text-[10px] font-bold', t.overdue ? 'bg-tornado/20 text-[#F1948A]' : 'bg-white/[0.06] text-[#C9C9CE]')}>
                      {t.overdue ? 'Overdue ' : 'Due '}
                      {t.dueOn}
                    </span>
                  ) : null}
                </p>
                {t.notes ? <p className="whitespace-pre-line text-[11px] leading-relaxed text-[#9A9A9F]">{t.notes}</p> : null}
                {t.link ? (
                  <Link href={t.link} className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-light hover:underline">
                    Open <ExternalLink className="size-3" aria-hidden="true" />
                  </Link>
                ) : null}
              </div>
              <div className="flex shrink-0 gap-1 opacity-60 group-hover:opacity-100">
                <button type="button" aria-label={`Edit "${t.title}"`} onClick={() => setEditing(t.id)} className="rounded p-1 text-[#9A9A9F] hover:bg-white/[0.06] hover:text-white">
                  <Pencil className="size-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label={`Delete "${t.title}"`}
                  onClick={() => void run(t.id, () => send('DELETE', `/api/admin/launch/${t.id}`))}
                  className="rounded p-1 text-[#9A9A9F] hover:bg-white/[0.06] hover:text-[#F1948A]"
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                </button>
              </div>
            </li>
          )
        )}
      </ul>
      {adding ? (
        <Editor
          initial={{ title: '', notes: '', dueOn: '' }}
          saveLabel="Add"
          onCancel={() => setAdding(false)}
          onSave={async (v) => {
            await run('new', () => send('POST', '/api/admin/launch', { section, title: v.title, notes: v.notes || null, dueOn: v.dueOn || null }))
            setAdding(false)
          }}
        />
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="inline-flex items-center gap-1 py-1 text-xs font-semibold text-sky-light hover:underline">
          <Plus className="size-3.5" aria-hidden="true" /> Add item
        </button>
      )}
      {error ? (
        <p role="alert" className="text-[11px] text-[#F1948A]">
          {error}
        </p>
      ) : null}
    </div>
  )
}
