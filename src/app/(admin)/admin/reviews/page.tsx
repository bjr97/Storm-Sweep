import { Star } from 'lucide-react'
import Link from 'next/link'

import { AdminTopbar } from '@/components/admin/AdminTopbar'
import { EmptyState, Panel } from '@/components/admin/Panel'
import { ReviewFollowUp } from '@/components/admin/ReviewFollowUp'
import { listReviews, REVIEW_FILTERS, type ReviewFilter } from '@/lib/admin/reviews'
import { formatBusinessDate } from '@/lib/admin/time'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Reviews · Storm Sweep Admin' }

const FILTER_LABEL: Record<ReviewFilter, string> = { all: 'All', follow_up: 'Needs follow-up', happy: '4–5 stars' }

function Stars({ rating }: { rating: number }): React.ReactElement {
  return (
    <span className="flex" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={n <= rating ? 'size-3.5 fill-wheat-light text-wheat-light' : 'size-3.5 text-white/15'} aria-hidden="true" />
      ))}
    </span>
  )
}

export default async function AdminReviewsPage({ searchParams }: { searchParams: { filter?: string } }): Promise<React.ReactElement> {
  const filter = (REVIEW_FILTERS as readonly string[]).includes(searchParams.filter ?? '') ? (searchParams.filter as ReviewFilter) : 'all'
  const { reviews, counts, average, distribution } = await listReviews(filter)
  const max = Math.max(1, ...Object.values(distribution))

  return (
    <>
      <AdminTopbar
        title="Reviews"
        subtitle={`${counts.all} review${counts.all === 1 ? '' : 's'}${average === null ? '' : ` · ${average.toFixed(1)}★ average`}${counts.follow_up ? ` · ${counts.follow_up} need follow-up` : ''}`}
      />
      <main className="flex-1 space-y-4 overflow-y-auto px-4 py-6 sm:px-7">
        <div className="grid gap-4 xl:grid-cols-3">
          <Panel title="Rating spread">
            <ul className="space-y-2">
              {([5, 4, 3, 2, 1] as const).map((n) => (
                <li key={n} className="flex items-center gap-3 text-[13px]">
                  <span className="w-6 shrink-0 text-[#C9C9CE]">{n}★</span>
                  <progress
                    value={distribution[n]}
                    max={max}
                    aria-label={`${distribution[n]} reviews with ${n} stars`}
                    className="block h-2 flex-1 appearance-none overflow-hidden rounded-full bg-white/[0.08] [&::-moz-progress-bar]:bg-[#B08A2E] [&::-webkit-progress-bar]:bg-white/[0.08] [&::-webkit-progress-value]:bg-[#B08A2E]"
                  />
                  <span className="w-6 shrink-0 text-right text-[#F0F0F0]">{distribution[n]}</span>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="How follow-up works" className="xl:col-span-2">
            <p className="text-[13px] leading-relaxed text-[#C9C9CE]">
              Reviews of 3 stars or fewer are flagged until you mark them followed up — call the customer, make it right, and leave
              yourself a private note. Customers who rate 4–5 stars are offered your Google review link. Every rating also feeds the
              Sweeper&apos;s tier score.
            </p>
          </Panel>
        </div>

        <nav aria-label="Filter reviews" className="flex w-fit flex-wrap rounded-lg border border-white/[0.07] bg-white/[0.04] p-0.5">
          {REVIEW_FILTERS.map((f) => (
            <Link
              key={f}
              href={f === 'all' ? '/admin/reviews' : `/admin/reviews?filter=${f}`}
              aria-current={f === filter ? 'page' : undefined}
              className={cn('rounded-md px-3 py-1.5 text-xs font-semibold', f === filter ? 'bg-sky text-white' : 'text-[#9A9A9F] hover:text-white')}
            >
              {FILTER_LABEL[f]} <span className="opacity-70">{counts[f]}</span>
            </Link>
          ))}
        </nav>

        <Panel title="Reviews" bodyClassName="p-0">
          {reviews.length === 0 ? (
            <EmptyState>{filter === 'follow_up' ? 'Nothing needs follow-up. 🎉' : 'No reviews yet.'}</EmptyState>
          ) : (
            <ul className="divide-y divide-white/[0.07]">
              {reviews.map((r) => (
                <li key={r.id} className={cn('space-y-2 px-4 py-4', r.needsFollowUp && 'bg-tornado/[0.06]')}>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
                    <Stars rating={r.rating} />
                    <Link href={`/admin/customers/${r.customerId}`} className="font-semibold text-[#F0F0F0] hover:text-sky-light hover:underline">
                      {r.customerName}
                    </Link>
                    {r.sweeperName ? <span className="text-[#9A9A9F]">Sweeper: {r.sweeperName}</span> : null}
                    <Link href={`/admin/jobs/${r.jobId}`} className="text-[11px] text-sky-light hover:underline">visit</Link>
                    <span className="text-[11px] text-[#8A8A8F]">{formatBusinessDate(new Date(r.createdAt), { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    {r.needsFollowUp ? <span className="text-[10px] font-bold uppercase tracking-wider text-[#F1948A]">Needs follow-up</span> : null}
                    {r.followedUpAt ? <span className="text-[10px] font-bold uppercase tracking-wider text-[#2ECC71]">Followed up</span> : null}
                  </div>
                  {r.body ? <p className="text-[13px] text-[#C9C9CE]">“{r.body}”</p> : <p className="text-[12px] italic text-[#8A8A8F]">No comment</p>}
                  {r.rating <= 3 || r.adminNote ? <ReviewFollowUp reviewId={r.id} followedUp={Boolean(r.followedUpAt)} note={r.adminNote} /> : null}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </main>
    </>
  )
}
