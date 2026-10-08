'use client'

import { CheckCircle2, ChevronDown, PlayCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { QUIZ_QUESTIONS, TRAINING_MODULES } from '@/lib/sweepers/training'
import { cn } from '@/lib/utils'

/** Onboarding: read each section, then pass the quiz (graded on the server). */
export function TrainingCourse({ initialRead, completed }: { initialRead: string[]; completed: boolean }): React.ReactElement {
  const router = useRouter()
  const [read, setRead] = useState<string[]>(initialRead)
  const [open, setOpen] = useState<string | null>(completed ? null : TRAINING_MODULES.find((m) => !initialRead.includes(m.id))?.id ?? null)
  const [answers, setAnswers] = useState<(number | null)[]>(QUIZ_QUESTIONS.map(() => null))
  const [wrong, setWrong] = useState<string[]>([])
  const [passed, setPassed] = useState(completed)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const allRead = TRAINING_MODULES.every((m) => read.includes(m.id))

  async function post(body: unknown): Promise<Record<string, unknown> | null> {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/sweeper/training', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const json = (await res.json()) as { data?: Record<string, unknown>; error?: string }
      if (!res.ok || !json.data) {
        setError(json.error ?? 'Something went wrong')
        return null
      }
      return json.data
    } catch {
      setError('No connection. Try again.')
      return null
    } finally {
      setBusy(false)
    }
  }

  async function markRead(id: string): Promise<void> {
    const data = await post({ action: 'read', module: id })
    if (!data) return
    const next = data.read as string[]
    setRead(next)
    setOpen(TRAINING_MODULES.find((m) => !next.includes(m.id))?.id ?? null)
  }

  async function submitQuiz(): Promise<void> {
    if (answers.some((a) => a === null)) {
      setError('Answer every question first')
      return
    }
    const data = await post({ action: 'quiz', answers })
    if (!data) return
    setWrong(data.wrong as string[])
    if (data.passed) {
      setPassed(true)
      router.refresh()
    }
  }

  return (
    <div className="space-y-4">
      <ol className="space-y-2">
        {TRAINING_MODULES.map((m, i) => {
          const done = read.includes(m.id)
          const isOpen = open === m.id
          return (
            <li key={m.id} className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#1C1C1F]">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : m.id)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
              >
                {done ? (
                  <CheckCircle2 className="size-5 shrink-0 text-[#2ECC71]" aria-label="Done" />
                ) : (
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-white/25 text-[11px] font-bold text-[#C9C9CE]">{i + 1}</span>
                )}
                <span className="flex-1">
                  <span className="block text-sm font-semibold text-white">{m.title}</span>
                  <span className="text-[11px] text-[#8A8A8F]">About {m.minutes} min</span>
                </span>
                <ChevronDown className={cn('size-4 text-[#8A8A8F] transition-transform', isOpen && 'rotate-180')} aria-hidden="true" />
              </button>
              {isOpen ? (
                <div className="space-y-3 border-t border-white/[0.07] px-4 py-3">
                  {m.videoUrl ? (
                    <a href={m.videoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-sky-light hover:underline">
                      <PlayCircle className="size-4" aria-hidden="true" /> Watch the video
                    </a>
                  ) : null}
                  <ul className="space-y-2 text-sm leading-relaxed text-[#C9C9CE]">
                    {m.points.map((p) => (
                      <li key={p} className="flex gap-2">
                        <span className="mt-2 size-1.5 shrink-0 rounded-full bg-sky-light" aria-hidden="true" />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                  {!done ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void markRead(m.id)}
                      className="h-10 w-full rounded-lg bg-sky text-sm font-bold text-white hover:bg-sky-light disabled:opacity-60"
                    >
                      {busy ? 'Saving…' : 'Got it'}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </li>
          )
        })}
      </ol>

      {passed ? (
        <div role="status" className="rounded-xl border border-[#2ECC71]/40 bg-[#27AE60]/10 px-4 py-3 text-sm text-[#2ECC71]">
          <p className="font-bold">Training complete. You can claim jobs now.</p>
          <p className="text-[#C9C9CE]">This guide stays here if you need a refresher.</p>
        </div>
      ) : allRead ? (
        <section aria-labelledby="quiz" className="space-y-4 rounded-xl border border-white/[0.07] bg-[#1C1C1F] p-4">
          <h2 id="quiz" className="font-[family-name:var(--font-bebas)] text-2xl tracking-wide text-white">
            Quick quiz
          </h2>
          <p className="text-xs text-[#9A9A9F]">Get all {QUIZ_QUESTIONS.length} right to finish. You can try as many times as you need.</p>
          {QUIZ_QUESTIONS.map((q, qi) => (
            <fieldset key={q.id} className={cn('space-y-2 rounded-lg p-2', wrong.includes(q.id) && 'bg-tornado/10 ring-1 ring-tornado/40')}>
              <legend className="text-sm font-semibold text-white">
                {qi + 1}. {q.question}
              </legend>
              {q.options.map((o, oi) => (
                <label key={o} className="flex items-start gap-2 text-sm text-[#C9C9CE]">
                  <input
                    type="radio"
                    name={q.id}
                    checked={answers[qi] === oi}
                    onChange={() => setAnswers((a) => a.map((v, i) => (i === qi ? oi : v)))}
                    className="mt-1 accent-sky"
                  />
                  {o}
                </label>
              ))}
              {wrong.includes(q.id) ? <p className="text-xs font-semibold text-[#F1948A]">Not quite. Check the guide above and try again.</p> : null}
            </fieldset>
          ))}
          <button
            type="button"
            disabled={busy}
            onClick={() => void submitQuiz()}
            className="h-11 w-full rounded-lg bg-sky text-sm font-bold text-white hover:bg-sky-light disabled:opacity-60"
          >
            {busy ? 'Checking…' : 'Submit answers'}
          </button>
        </section>
      ) : (
        <p className="text-center text-xs text-[#8A8A8F]">Finish every section to unlock the quiz.</p>
      )}
      {error ? (
        <p role="alert" className="text-center text-sm font-semibold text-[#F1948A]">
          {error}
        </p>
      ) : null}
    </div>
  )
}
