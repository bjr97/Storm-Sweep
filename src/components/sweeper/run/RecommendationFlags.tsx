'use client'

import { useState } from 'react'

import { postRunAction } from '@/components/sweeper/run/useRunAction'
import { RECOMMENDATIONS, type RecommendationKey, type Recommendations } from '@/lib/sweepers/jobRun'

/** Log upgrade opportunities for later follow-up. Saves on toggle and on note blur. */
export function RecommendationFlags({
  jobId,
  initial,
  locked,
}: {
  jobId: string
  initial: Recommendations
  locked: boolean
}): React.ReactElement {
  const [flags, setFlags] = useState<Recommendations>(initial)
  const [error, setError] = useState<string | null>(null)

  async function save(key: RecommendationKey, on: boolean, note: string | null): Promise<void> {
    setError(null)
    const res = await postRunAction(jobId, { action: 'recommend', key, on, note })
    if (!res.ok) setError(res.error)
  }

  function toggle(key: RecommendationKey, on: boolean): void {
    setFlags((f) => {
      const next = { ...f }
      if (on) next[key] = { note: null, at: new Date().toISOString() }
      else delete next[key]
      return next
    })
    void save(key, on, null)
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-[#9A9A9F]">
        Not buying today? Tick what they could use — it shows on their report as a recommendation so the office can follow up.
      </p>
      <ul className="space-y-1.5">
        {RECOMMENDATIONS.map((r) => {
          const on = Boolean(flags[r.key])
          return (
            <li key={r.key} className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2">
              <label className="flex cursor-pointer items-center gap-3 text-sm text-[#F0F0F0]">
                <input
                  type="checkbox"
                  checked={on}
                  disabled={locked}
                  onChange={(e) => toggle(r.key, e.target.checked)}
                  className="size-5 accent-sky"
                />
                {r.label}
              </label>
              {on ? (
                <input
                  defaultValue={flags[r.key]?.note ?? ''}
                  disabled={locked}
                  maxLength={300}
                  placeholder="Note (optional) — e.g. hinge pin rusted"
                  aria-label={`Note for ${r.label}`}
                  onBlur={(e) => void save(r.key, true, e.target.value.trim() || null)}
                  className="mt-2 h-10 w-full rounded-md border border-white/10 bg-[#0F0F11] px-3 text-sm text-[#F0F0F0] outline-none focus-visible:border-sky"
                />
              ) : null}
            </li>
          )
        })}
      </ul>
      {error ? <p role="alert" className="text-sm font-semibold text-[#F1948A]">{error}</p> : null}
    </div>
  )
}
