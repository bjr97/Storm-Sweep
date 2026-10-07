import { Search, ShieldCheck, Star } from 'lucide-react'
import Link from 'next/link'

import { AdminTopbar } from '@/components/admin/AdminTopbar'
import { EmptyState } from '@/components/admin/Panel'
import { CUSTOMER_FILTERS, listCustomers, type CustomerFilter } from '@/lib/admin/customers'
import { formatBusinessDate } from '@/lib/admin/time'
import { cn, formatCurrency } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Customers · Storm Sweep Admin' }

const FILTER_LABEL: Record<CustomerFilter, string> = { all: 'All', members: 'Members', one_time: 'One-time', no_visits: 'No visits yet' }

const short = (iso: string | null): string => (iso ? formatBusinessDate(new Date(iso), { month: 'short', day: 'numeric', year: '2-digit' }) : '—')

export default async function AdminCustomersPage({ searchParams }: { searchParams: { filter?: string; q?: string } }): Promise<React.ReactElement> {
  const filter = (CUSTOMER_FILTERS as readonly string[]).includes(searchParams.filter ?? '') ? (searchParams.filter as CustomerFilter) : 'all'
  const q = (searchParams.q ?? '').slice(0, 100)
  const { customers, counts } = await listCustomers(filter, q)
  const href = (f: CustomerFilter): string => {
    const p = new URLSearchParams()
    if (f !== 'all') p.set('filter', f)
    if (q) p.set('q', q)
    const s = p.toString()
    return s ? `/admin/customers?${s}` : '/admin/customers'
  }

  return (
    <>
      <AdminTopbar title="Customers" subtitle={`${counts.all} customer${counts.all === 1 ? '' : 's'} · ${counts.members} member${counts.members === 1 ? '' : 's'}`} />
      <main className="flex-1 space-y-4 overflow-y-auto px-4 py-6 sm:px-7">
        <div className="flex flex-wrap items-center gap-3">
          <form role="search" action="/admin/customers" className="flex h-9 min-w-[240px] flex-1 items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.04] px-3 sm:max-w-sm">
            <Search className="size-4 shrink-0 text-[#8A8A8F]" aria-hidden="true" />
            {filter !== 'all' ? <input type="hidden" name="filter" value={filter} /> : null}
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Name, email, phone or address…"
              aria-label="Search customers"
              className="min-w-0 flex-1 bg-transparent text-[13px] text-[#F0F0F0] outline-none placeholder:text-[#8A8A8F]"
            />
          </form>
          <nav aria-label="Filter customers" className="flex flex-wrap rounded-lg border border-white/[0.07] bg-white/[0.04] p-0.5">
            {CUSTOMER_FILTERS.map((f) => (
              <Link
                key={f}
                href={href(f)}
                aria-current={f === filter ? 'page' : undefined}
                className={cn('rounded-md px-3 py-1.5 text-xs font-semibold', f === filter ? 'bg-sky text-white' : 'text-[#9A9A9F] hover:text-white')}
              >
                {FILTER_LABEL[f]} <span className="opacity-70">{counts[f]}</span>
              </Link>
            ))}
          </nav>
        </div>

        <section className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#1C1C1F]">
          {customers.length === 0 ? (
            <EmptyState>{q ? `No customers match “${q}”.` : 'No customers here yet.'}</EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-[13px]">
                <thead className="text-[10px] uppercase tracking-[0.15em] text-[#8A8A8F]">
                  <tr className="border-b border-white/[0.07]">
                    <th scope="col" className="px-4 py-2.5 font-bold">Customer</th>
                    <th scope="col" className="px-3 py-2.5 font-bold">Membership</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-bold">Visits</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-bold">Spend</th>
                    <th scope="col" className="px-3 py-2.5 font-bold">Last visit</th>
                    <th scope="col" className="px-3 py-2.5 font-bold">Next visit</th>
                    <th scope="col" className="px-4 py-2.5 font-bold">Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c.id} className="border-b border-white/[0.07] last:border-b-0 hover:bg-white/[0.02]">
                      <th scope="row" className="px-4 py-3 font-normal">
                        <Link href={`/admin/customers/${c.id}`} className="font-semibold text-[#F0F0F0] hover:text-sky-light hover:underline">
                          {c.name}
                        </Link>
                        <p className="text-[11px] text-[#8A8A8F]">{[c.email, c.phone].filter(Boolean).join(' · ')}</p>
                      </th>
                      <td className="px-3 py-3">
                        {c.isMember ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-wheat-light">
                            <ShieldCheck className="size-3.5" aria-hidden="true" /> {c.plan === 'monthly' ? 'Monthly' : 'Annual'} · {c.visitsUsed}/2
                          </span>
                        ) : (
                          <span className="text-xs text-[#8A8A8F]">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right text-[#F0F0F0]">
                        {c.completed}
                        {c.upcoming ? <span className="text-[#8A8A8F]"> +{c.upcoming}</span> : null}
                      </td>
                      <td className="px-3 py-3 text-right text-[#F0F0F0]">{formatCurrency(c.spend)}</td>
                      <td className="px-3 py-3 text-[#C9C9CE]">{short(c.lastVisit)}</td>
                      <td className="px-3 py-3 text-[#C9C9CE]">{short(c.nextVisit)}</td>
                      <td className="px-4 py-3 text-[#C9C9CE]">
                        {c.avgRating === null ? '—' : (
                          <span className="inline-flex items-center gap-1">
                            {c.avgRating.toFixed(1)} <Star className="size-3 fill-wheat-light text-wheat-light" aria-label="stars" />
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </>
  )
}
