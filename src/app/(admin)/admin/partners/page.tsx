import { AdminTopbar } from '@/components/admin/AdminTopbar'
import { CopyLinkButton, PartnerRowActions } from '@/components/admin/PartnerActions'
import { PartnerForm } from '@/components/admin/PartnerForm'
import { EmptyState, Panel } from '@/components/admin/Panel'
import { PARTNER_TYPE_LABEL } from '@/lib/admin/partnerRules'
import { listPartners } from '@/lib/admin/partners'
import { cn, formatCurrency } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Partners · Storm Sweep Admin' }

export default async function AdminPartnersPage(): Promise<React.ReactElement> {
  const partners = await listPartners()
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://stormsweep.com').replace(/\/$/, '')
  const owed = partners.reduce((n, p) => n + p.owed, 0)
  const completed = partners.reduce((n, p) => n + p.completed, 0)

  return (
    <>
      <AdminTopbar
        title="Partners"
        subtitle={`${partners.filter((p) => p.active).length} active · ${completed} completed referral${completed === 1 ? '' : 's'} · ${formatCurrency(owed)} owed`}
      />
      <main className="flex-1 space-y-4 overflow-y-auto px-4 py-6 sm:px-7">
        <Panel title="Add a partner" subtitle="They share their link; you owe them when a referred visit is completed">
          <PartnerForm />
        </Panel>

        <Panel title="Partners" bodyClassName="p-0">
          {partners.length === 0 ? (
            <EmptyState>No partners yet. Roofers, realtors and lawn services are great first partners.</EmptyState>
          ) : (
            <ul className="divide-y divide-white/[0.07]">
              {partners.map((p) => {
                const link = `${appUrl}/book?ref=${p.referral_code}`
                return (
                  <li key={p.id} className={cn('space-y-3 px-4 py-4', !p.active && 'opacity-60')}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#F0F0F0]">
                          {p.name}
                          {!p.active ? <span className="ml-2 text-[10px] font-bold uppercase text-[#8A8A8F]">Inactive</span> : null}
                        </p>
                        <p className="text-xs text-[#9A9A9F]">
                          {PARTNER_TYPE_LABEL[p.type]}
                          {p.contact_name ? ` · ${p.contact_name}` : ''}
                          {p.contact_phone ? (
                            <>
                              {' · '}
                              <a href={`tel:${p.contact_phone}`} className="text-sky-light hover:underline">{p.contact_phone}</a>
                            </>
                          ) : null}
                        </p>
                        <p className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                          <code className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[#F0F0F0]">{p.referral_code}</code>
                          <span className="truncate text-[#8A8A8F]">{link}</span>
                          <CopyLinkButton url={link} />
                        </p>
                        {p.notes ? <p className="mt-1 text-xs text-[#9A9A9F]">{p.notes}</p> : null}
                      </div>
                      <dl className="grid grid-cols-4 gap-4 text-right text-xs">
                        <div><dt className="text-[#8A8A8F]">Booked</dt><dd className="font-semibold text-[#F0F0F0]">{p.booked}</dd></div>
                        <div><dt className="text-[#8A8A8F]">Completed</dt><dd className="font-semibold text-[#F0F0F0]">{p.completed}</dd></div>
                        <div><dt className="text-[#8A8A8F]">Paid</dt><dd className="font-semibold text-[#F0F0F0]">{formatCurrency(p.total_paid_out ?? 0)}</dd></div>
                        <div><dt className="text-[#8A8A8F]">Owed</dt><dd className={cn('font-semibold', p.owed ? 'text-wheat-light' : 'text-[#F0F0F0]')}>{formatCurrency(p.owed)}</dd></div>
                      </dl>
                    </div>
                    <PartnerRowActions
                      partnerId={p.id}
                      owed={p.owed}
                      initial={{
                        name: p.name,
                        type: p.type,
                        referral_code: p.referral_code,
                        contact_name: p.contact_name,
                        contact_phone: p.contact_phone,
                        payout_per_referral: p.payout_per_referral ?? 0,
                        notes: p.notes,
                        active: p.active ?? true,
                      }}
                    />
                    <p className="text-[11px] text-[#8A8A8F]">{formatCurrency(p.payout_per_referral ?? 0)} per completed referral</p>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>
      </main>
    </>
  )
}
