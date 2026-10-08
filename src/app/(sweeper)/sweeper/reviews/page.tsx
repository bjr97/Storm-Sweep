import { Star } from 'lucide-react'
import Link from 'next/link'

import { formatBusinessDate } from '@/lib/admin/time'
import { createClient } from '@/lib/supabase/server'
import { getSweeperReviews } from '@/lib/sweepers/reviews'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'My reviews · Storm Sweep' }

function Stars({ rating, className }: { rating: number; className?: string }): React.ReactElement {
  return (
    <span className={cn('inline-flex', className)} aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={cn('size-4', n <= rating ? 'fill-wheat text-wheat' : 'text-white/20')} aria-hidden="true" />
      ))}
    </span>
  )
}

export default async function SweeperReviewsPage(): Promise<React.ReactElement> {
  const {
    data: { user },
  } = await createClient().auth.getUser()
  const { reviews, average, count, distribution } = await getSweeperReviews(user!.id)

  return (
    <main className="space-y-4 px-4 pt-5">
      <div>
        <Link href="/sweeper" className="text-xs font-semibold text-sky-light hover:underline">
          ← Jobs
        </Link>
        <h1 className="font-[family-name:var(--font-bebas)] text-3xl tracking-wide text-white">My reviews</h1>
        <p className="text-xs text-[#9A9A9F]">What customers said after your visits. Your rating is 40% of your tier score.</p>
      </div>

      {count === 0 ? (
        <p className="rounded-xl border border-dashed border-white/[0.1] px-4 py-8 text-center text-sm text-[#8A8A8F]">
          No reviews yet. Customers are asked to rate each visit after it&apos;s complete.
        </p>
      ) : (
        <>
          <section aria-label="Rating summary" className="flex items-center gap-4 rounded-xl border border-white/[0.07] bg-[#1C1C1F] p-4">
            <div className="text-center">
              <p className="font-[family-name:var(--font-bebas)] text-5xl leading-none text-white">{average!.toFixed(1)}</p>
              <Stars rating={Math.round(average!)} className="mt-1" />
              <p className="mt-1 text-[11px] text-[#8A8A8F]">
                {count} review{count === 1 ? '' : 's'}
              </p>
            </div>
            <ul className="flex-1 space-y-1">
              {([5, 4, 3, 2, 1] as const).map((n) => (
                <li key={n} className="flex items-center gap-2 text-[11px] text-[#9A9A9F]">
                  <span className="w-3">{n}</span>
                  <progress
                    value={distribution[n]}
                    max={count}
                    aria-label={`${distribution[n]} reviews with ${n} stars`}
                    className="block h-1.5 flex-1 appearance-none overflow-hidden rounded-full bg-white/[0.06] [&::-moz-progress-bar]:bg-wheat [&::-webkit-progress-bar]:bg-white/[0.06] [&::-webkit-progress-value]:bg-wheat"
                  />
                  <span className="w-5 text-right">{distribution[n]}</span>
                </li>
              ))}
            </ul>
          </section>

          <ul className="space-y-2">
            {reviews.map((r) => (
              <li key={r.jobId} className="space-y-1 rounded-xl border border-white/[0.07] bg-[#1C1C1F] p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Stars rating={r.rating} />
                  <span className="text-sm font-semibold text-white">{r.customerFirstName}</span>
                  <span className="text-[11px] text-[#8A8A8F]">
                    {formatBusinessDate(new Date(r.createdAt), { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                {r.body ? <p className="text-sm leading-relaxed text-[#C9C9CE]">“{r.body}”</p> : <p className="text-xs italic text-[#8A8A8F]">No comment</p>}
                {r.rating <= 3 ? <p className="text-[11px] text-[#9A9A9F]">The office follows up with every 1–3 star review.</p> : null}
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  )
}
