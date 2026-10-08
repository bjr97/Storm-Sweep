import { AdminTopbar } from '@/components/admin/AdminTopbar'
import { EmptyState, Panel } from '@/components/admin/Panel'
import { ResetDemoButton, ViewAsButton } from '@/components/admin/ViewAsButton'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'View as · Storm Sweep Admin' }

type Person = { id: string; full_name: string | null; role: string }

export default async function ViewAsPage({ searchParams }: { searchParams: { q?: string } }): Promise<React.ReactElement> {
  const q = (searchParams.q ?? '').trim().slice(0, 60)
  const supabase = createServiceClient()
  let query = supabase
    .from('profiles')
    .select('id, full_name, role')
    .in('role', ['customer', 'sweeper'])
    .eq('is_demo', false)
    .order('full_name')
    .limit(60)
  if (q) query = query.ilike('full_name', `%${q.replace(/[%_,()]/g, ' ')}%`)
  const { data } = await query
  const people: Person[] = data ?? []

  const list = (role: 'customer' | 'sweeper'): React.ReactElement => {
    const rows = people.filter((p) => p.role === role)
    if (rows.length === 0) {
      return <EmptyState>{q ? 'No matches.' : `No ${role === 'customer' ? 'customers' : 'Sweepers'} yet.`}</EmptyState>
    }
    return (
      <ul className="divide-y divide-white/[0.07]">
        {rows.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-3 py-2.5 text-[13px]">
            <span className="font-semibold text-[#F0F0F0]">{p.full_name ?? 'No name'}</span>
            <ViewAsButton target={{ userId: p.id }} label="View as (read-only)" />
          </li>
        ))}
      </ul>
    )
  }

  return (
    <>
      <AdminTopbar title="View as" subtitle="See the customer and Sweeper apps exactly as they do" />
      <main className="flex-1 space-y-4 overflow-y-auto px-4 py-6 sm:px-7">
        <Panel title="Demo accounts" subtitle="Everything works here: book, claim, run a visit">
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2 rounded-lg border border-white/[0.07] bg-[#141416] p-4">
                <p className="text-sm font-bold text-[#F0F0F0]">Dana Demo · customer</p>
                <p className="text-xs leading-relaxed text-[#9A9A9F]">A finished visit with photos and a review, plus upcoming visits.</p>
                <ViewAsButton target={{ demo: 'customer' }} label="View as customer" primary />
              </div>
              <div className="space-y-2 rounded-lg border border-white/[0.07] bg-[#141416] p-4">
                <p className="text-sm font-bold text-[#F0F0F0]">Sam Demo · Sweeper</p>
                <p className="text-xs leading-relaxed text-[#9A9A9F]">An open job to claim, a scheduled visit and earnings to review.</p>
                <ViewAsButton target={{ demo: 'sweeper' }} label="View as Sweeper" primary />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <ResetDemoButton />
              <p className="text-xs text-[#8A8A8F]">
                Demo data never shows in your dashboard, revenue, payouts or the real job board, and demo accounts never get texts or emails.
              </p>
            </div>
          </div>
        </Panel>

        <Panel title="Real accounts" subtitle="Read-only: you see their screens, but buttons are switched off">
          <form method="get" className="mb-3 flex gap-2">
            <label htmlFor="q" className="sr-only">
              Search by name
            </label>
            <input
              id="q"
              name="q"
              defaultValue={q}
              placeholder="Search by name"
              className="h-8 w-full max-w-xs rounded-md border border-white/10 bg-[#0F0F11] px-2.5 text-[13px] text-[#F0F0F0]"
            />
            <button type="submit" className="h-8 rounded-md bg-white/[0.06] px-3 text-xs font-semibold text-[#F0F0F0] hover:bg-white/[0.1]">
              Search
            </button>
          </form>
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#8A8A8F]">Customers</p>
              {list('customer')}
            </div>
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#8A8A8F]">Sweepers</p>
              {list('sweeper')}
            </div>
          </div>
        </Panel>
      </main>
    </>
  )
}
