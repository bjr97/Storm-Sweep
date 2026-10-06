'use client'

import { Search } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'

import { JOB_STATUS_LABEL } from '@/components/admin/StatusPill'
import {
  JOB_STATUS_FILTERS,
  JOB_WHEN_FILTERS,
  type JobStatusFilter,
  type JobWhenFilter,
} from '@/lib/admin/jobConstants'
import { cn } from '@/lib/utils'

const WHEN_LABEL: Record<JobWhenFilter, string> = { upcoming: 'Upcoming', past: 'Past', all: 'All dates' }

type JobsFiltersProps = { status: JobStatusFilter; when: JobWhenFilter; q: string }

export function JobsFilters({ status, when, q }: JobsFiltersProps): React.ReactElement {
  const router = useRouter()
  const pathname = usePathname()
  const [search, setSearch] = useState(q)

  function apply(next: Partial<JobsFiltersProps>): void {
    const params = new URLSearchParams()
    const merged = { status, when, q: search, ...next }
    if (merged.status !== 'all') params.set('status', merged.status)
    if (merged.when !== 'upcoming') params.set('when', merged.when)
    if (merged.q.trim()) params.set('q', merged.q.trim())
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault()
          apply({ q: search })
        }}
        className="flex h-9 min-w-[240px] flex-1 items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.04] px-3 sm:max-w-sm"
      >
        <Search className="size-4 shrink-0 text-[#8A8A8F]" aria-hidden="true" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search customer or address…"
          aria-label="Search jobs by customer name or address"
          className="min-w-0 flex-1 bg-transparent text-[13px] text-[#F0F0F0] outline-none placeholder:text-[#8A8A8F]"
        />
      </form>

      <div className="flex rounded-lg border border-white/[0.07] bg-white/[0.04] p-0.5" role="group" aria-label="Date range">
        {JOB_WHEN_FILTERS.map((w) => (
          <button
            key={w}
            type="button"
            aria-pressed={when === w}
            onClick={() => apply({ when: w })}
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
              when === w ? 'bg-sky/20 text-sky-light' : 'text-[#9A9A9F] hover:text-white'
            )}
          >
            {WHEN_LABEL[w]}
          </button>
        ))}
      </div>

      <select
        aria-label="Filter by status"
        value={status}
        onChange={(e) => apply({ status: e.target.value as JobStatusFilter })}
        className="h-9 rounded-lg border border-white/[0.07] bg-[#1C1C1F] px-2.5 text-[13px] text-[#F0F0F0] outline-none focus-visible:border-sky"
      >
        {JOB_STATUS_FILTERS.map((s) => (
          <option key={s} value={s}>
            {s === 'all' ? 'All statuses' : JOB_STATUS_LABEL[s]}
          </option>
        ))}
      </select>
    </div>
  )
}
