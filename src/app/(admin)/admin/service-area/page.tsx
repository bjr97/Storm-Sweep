import { AdminTopbar } from '@/components/admin/AdminTopbar'
import { EmptyState, Panel } from '@/components/admin/Panel'
import { AddZipForm, MarkContactedButton, OpenZipButton, RemoveZipButton } from '@/components/admin/ServiceAreaControls'
import { formatBusinessDate } from '@/lib/admin/time'
import { getWaitlistDemand } from '@/lib/serviceArea'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Service area · Storm Sweep Admin' }

const short = (iso: string): string => formatBusinessDate(new Date(iso), { month: 'short', day: 'numeric' })

export default async function ServiceAreaPage(): Promise<React.ReactElement> {
  const supabase = createServiceClient()
  const [{ data: zips }, { demand, total }, { data: people }] = await Promise.all([
    supabase.from('service_zips').select('zip, label').order('zip'),
    getWaitlistDemand(),
    supabase.from('waitlist').select('id, zip, name, email, phone, created_at, notified_at').order('created_at', { ascending: false }).limit(2000),
  ])
  const served = new Set((zips ?? []).map((z) => z.zip))

  return (
    <>
      <AdminTopbar
        title="Service area"
        subtitle={`${served.size ? `${served.size} ZIP${served.size === 1 ? '' : 's'} booked online` : 'Booking open everywhere'} · ${total} on the waitlist`}
      />
      <main className="flex-1 space-y-4 overflow-y-auto px-4 py-6 sm:px-7">
        <Panel title="ZIPs we book online" subtitle="Customers outside these can join the waitlist instead">
          <div className="space-y-4">
            {zips && zips.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {zips.map((z) => (
                  <li key={z.zip} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-[#141416] py-1 pl-3 pr-1.5 text-xs text-[#F0F0F0]">
                    <span className="font-mono font-bold">{z.zip}</span>
                    {z.label ? <span className="text-[#9A9A9F]">{z.label}</span> : null}
                    <RemoveZipButton zip={z.zip} />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState>No ZIPs listed, so every address can book online.</EmptyState>
            )}
            <AddZipForm />
            <p className="text-[11px] text-[#8A8A8F]">
              Phone bookings you make from admin aren&apos;t limited by this list. Removing every ZIP opens booking everywhere.
            </p>
          </div>
        </Panel>

        <Panel title="Waitlist demand" subtitle="Where people want you next" bodyClassName="p-0">
          {demand.length === 0 ? (
            <EmptyState>No one on the waitlist yet.</EmptyState>
          ) : (
            <ul className="divide-y divide-white/[0.07]">
              {demand.map((d) => (
                <li key={d.zip} className="px-4 py-3">
                  <details>
                    <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
                      <span className="font-mono font-bold text-white">{d.zip}</span>
                      <span className="text-[#F0F0F0]">
                        {d.count} waiting
                      </span>
                      <span className="text-[#8A8A8F]">latest {short(d.latest)}</span>
                      <span className="ml-auto flex items-center gap-2">
                        {served.has(d.zip) ? <span className="text-[11px] font-semibold text-[#2ECC71]">Now served</span> : <OpenZipButton zip={d.zip} />}
                        <MarkContactedButton zip={d.zip} pending={d.pending} />
                      </span>
                    </summary>
                    <ul className="mt-2 space-y-1 text-xs">
                      {(people ?? [])
                        .filter((p) => p.zip === d.zip)
                        .map((p) => (
                          <li key={p.id} className="flex flex-wrap gap-x-2 text-[#C9C9CE]">
                            <span className="font-semibold text-[#F0F0F0]">{p.name ?? 'No name'}</span>
                            <a href={`mailto:${p.email}`} className="text-sky-light hover:underline">
                              {p.email}
                            </a>
                            {p.phone ? <span>{p.phone}</span> : null}
                            <span className="text-[#8A8A8F]">
                              joined {short(p.created_at)}
                              {p.notified_at ? ` · contacted ${short(p.notified_at)}` : ''}
                            </span>
                          </li>
                        ))}
                    </ul>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </main>
    </>
  )
}
