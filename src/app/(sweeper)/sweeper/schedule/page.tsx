import { ChevronRight, MapPin, ShieldCheck } from 'lucide-react'
import Link from 'next/link'

import { formatBusinessDate } from '@/lib/admin/time'
import { TIME_WINDOWS, jobTimeLabel } from '@/lib/booking/timeWindows'
import { getSweeperWeek } from '@/lib/sweepers/schedule'
import { createClient } from '@/lib/supabase/server'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Schedule · Storm Sweep' }

const SIZE_LABEL: Record<string, string> = { small: 'Small', standard: 'Standard', large: 'Large', xlarge: 'X-Large' }

export default async function SweeperSchedulePage({ searchParams }: { searchParams: { day?: string } }): Promise<React.ReactElement> {
  const {
    data: { user },
  } = await createClient().auth.getUser()
  const days = user ? await getSweeperWeek(user.id) : []
  const selected = days.find((d) => d.key === searchParams.day) ?? days[0]
  const weekCount = days.reduce((n, d) => n + d.jobs.length, 0)

  // Timeline: one row per arrival window (plus "Other" for jobs without one).
  const rows = [
    ...TIME_WINDOWS.filter((w) => w.value !== 'flexible').map((w) => ({ key: w.value, label: w.label, hours: w.hours })),
    { key: 'flexible', label: 'Flexible', hours: '8am–8pm' },
    { key: 'other', label: 'Other', hours: '' },
  ]
  const rowFor = (window: string | null): string => (window && rows.some((r) => r.key === window) ? window : 'other')

  return (
    <main className="space-y-4 px-4 pt-5">
      <div>
        <h1 className="font-[family-name:var(--font-bebas)] text-3xl tracking-wide text-white">My schedule</h1>
        <p className="text-xs text-[#9A9A9F]">Next 7 days · {weekCount} job{weekCount === 1 ? '' : 's'}</p>
      </div>

      {/* 7-day selector (scrolls sideways on narrow phones) */}
      <nav aria-label="Pick a day" className="-mx-4 overflow-x-auto px-4">
        <ol className="flex min-w-max gap-2">
          {days.map((d) => {
            const isSel = d.key === selected?.key
            return (
              <li key={d.key}>
                <Link
                  href={`/sweeper/schedule?day=${d.key}`}
                  scroll={false}
                  aria-current={isSel ? 'date' : undefined}
                  className={cn(
                    'flex w-14 flex-col items-center rounded-xl border py-2 text-center',
                    isSel ? 'border-sky bg-sky/15 text-white' : 'border-white/[0.07] bg-[#1C1C1F] text-[#C9C9CE] hover:border-sky/40'
                  )}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider">{d.isToday ? 'Today' : formatBusinessDate(d.date, { weekday: 'short' })}</span>
                  <span className="font-[family-name:var(--font-bebas)] text-2xl leading-none">{formatBusinessDate(d.date, { day: 'numeric' })}</span>
                  <span className={cn('mt-1 size-1.5 rounded-full', d.jobs.length ? 'bg-sky-light' : 'bg-transparent')} aria-hidden="true" />
                  <span className="sr-only">{d.jobs.length} jobs</span>
                </Link>
              </li>
            )
          })}
        </ol>
      </nav>

      {selected ? (
        <section aria-label={formatBusinessDate(selected.date, { weekday: 'long', month: 'long', day: 'numeric' })} className="space-y-2">
          <h2 className="text-sm font-bold text-[#F0F0F0]">
            {formatBusinessDate(selected.date, { weekday: 'long', month: 'long', day: 'numeric' })}
          </h2>
          {selected.jobs.length === 0 ? (
            <p className="rounded-xl border border-dashed border-white/[0.1] px-4 py-8 text-center text-sm text-[#8A8A8F]">
              Nothing scheduled. <Link href="/sweeper" className="font-semibold text-sky-light hover:underline">Find open jobs</Link>
            </p>
          ) : (
            <ol className="relative space-y-3 border-l border-white/[0.1] pl-4">
              {rows
                .filter((r) => selected.jobs.some((j) => rowFor(j.time_window) === r.key))
                .map((r) => (
                  <li key={r.key} className="space-y-2">
                    <p className="-ml-[21px] flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em] text-[#8A8A8F]">
                      <span className="size-2.5 rounded-full border-2 border-sky bg-[#0F0F11]" aria-hidden="true" />
                      {r.label} {r.hours ? <span className="normal-case tracking-normal">· {r.hours}</span> : null}
                    </p>
                    {selected.jobs
                      .filter((j) => rowFor(j.time_window) === r.key)
                      .map((j) => (
                        <Link
                          key={j.id}
                          href={`/sweeper/jobs/${j.id}`}
                          className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-[#1C1C1F] p-3 hover:border-sky/40"
                        >
                          <div className="min-w-0 flex-1 space-y-1">
                            <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-white">
                              {j.customerFirstName}
                              {j.isMember ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-wheat/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-wheat-light">
                                  <ShieldCheck className="size-3" aria-hidden="true" /> Member
                                </span>
                              ) : null}
                              {j.status === 'in_progress' ? <span className="text-[10px] font-bold uppercase text-sky-light">In progress</span> : null}
                              {j.status === 'complete' ? <span className="text-[10px] font-bold uppercase text-[#2ECC71]">Done</span> : null}
                            </p>
                            <p className="truncate text-xs text-[#C9C9CE]">
                              {jobTimeLabel(j.scheduled_at, j.time_window)} · {SIZE_LABEL[j.shelter_size]} · {j.service_type.join(' + ')}
                            </p>
                            <p className="flex items-center gap-1 truncate text-xs text-[#9A9A9F]">
                              <MapPin className="size-3 shrink-0" aria-hidden="true" /> {j.address}
                            </p>
                          </div>
                          <ChevronRight className="size-4 shrink-0 text-[#5A5A5F]" aria-hidden="true" />
                        </Link>
                      ))}
                  </li>
                ))}
            </ol>
          )}
        </section>
      ) : null}
    </main>
  )
}
