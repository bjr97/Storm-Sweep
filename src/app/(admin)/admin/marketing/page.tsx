import { ShieldAlert } from 'lucide-react'

import { AdminTopbar } from '@/components/admin/AdminTopbar'
import { DraftPostButtons, PostEditor } from '@/components/admin/MarketingControls'
import { EmptyState, Panel } from '@/components/admin/Panel'
import { PromoCodes, type PromoListItem } from '@/components/admin/PromoCodes'
import { getMarketingQueue, type ShareablePhoto } from '@/lib/admin/marketing'
import { formatBusinessDate, localDate } from '@/lib/admin/time'
import { describePromo, listPromos } from '@/lib/promos'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Marketing · Storm Sweep Admin' }

const PLATFORM_LABEL = { instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok' } as const

function Thumbs({ label, photos }: { label: string; photos: ShareablePhoto[] }): React.ReactElement {
  return (
    <div className="min-w-0 space-y-1">
      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8A8A8F]">{label}</p>
      <div className="grid grid-cols-2 gap-1.5">
        {photos.slice(0, 4).map((p) =>
          p.url ? (
            <a key={p.id} href={p.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-md bg-black/30" title="Open full size to save">
              {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URL */}
              <img src={p.url} alt={`${label} photo`} className="aspect-square w-full object-cover" />
            </a>
          ) : null
        )}
      </div>
    </div>
  )
}

export default async function AdminMarketingPage(): Promise<React.ReactElement> {
  const [{ visits, posts }, promoRows] = await Promise.all([getMarketingQueue(), listPromos()])
  const t = localDate(new Date())
  const today = `${t.year}-${String(t.month).padStart(2, '0')}-${String(t.day).padStart(2, '0')}`
  const promos: PromoListItem[] = promoRows.map((p) => ({
    id: p.id,
    code: p.code,
    label: describePromo(p),
    uses: p.uses,
    maxUses: p.max_uses,
    discountGiven: p.discountGiven,
    firstTimeOnly: p.first_time_only,
    expiresOn: p.expires_on,
    expired: Boolean(p.expires_on && p.expires_on < today),
    active: p.active,
    note: p.note,
  }))
  const drafts = posts.filter((p) => !p.publishedAt)
  const posted = posts.filter((p) => p.publishedAt)

  return (
    <>
      <AdminTopbar
        title="Marketing"
        subtitle={`${visits.length} visit${visits.length === 1 ? '' : 's'} with shareable photos · ${drafts.length} draft${drafts.length === 1 ? '' : 's'} · ${posted.length} posted`}
      />
      <main className="flex-1 space-y-4 overflow-y-auto px-4 py-6 sm:px-7">
        <p className="flex items-start gap-2 rounded-lg border border-white/[0.07] bg-[#1C1C1F] p-3 text-[13px] text-[#C9C9CE]">
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-wheat-light" aria-hidden="true" />
          Only visits where the customer turned on photo sharing appear here. Posts never include their name or street address —
          captions mention the city only. Consent is checked again when you mark a post as posted.
        </p>

        <Panel title="Ready to share" subtitle="Before & after from opted-in customers">
          {visits.length === 0 ? (
            <EmptyState>No shareable photos yet. Customers can opt in from their Account page.</EmptyState>
          ) : (
            <ul className="grid gap-4 lg:grid-cols-2">
              {visits.map((v) => (
                <li key={v.jobId} className="space-y-3 rounded-lg border border-white/[0.07] bg-[#141416] p-3">
                  <p className="text-[13px] text-[#F0F0F0]">
                    <span className="font-semibold">{v.city}</span>
                    <span className="text-[#9A9A9F]"> · {formatBusinessDate(new Date(v.completedAt), { month: 'short', day: 'numeric' })} · {v.services.join(' + ')}</span>
                    {v.drafted ? <span className="ml-2 text-[10px] font-bold uppercase text-sky-light">Drafted</span> : null}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <Thumbs label="Before" photos={v.before} />
                    <Thumbs label="After" photos={v.after} />
                  </div>
                  <DraftPostButtons jobId={v.jobId} />
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Posts" subtitle="Post from your phone, then mark it posted here" bodyClassName="p-0">
          {posts.length === 0 ? (
            <EmptyState>No drafts yet — draft one from a visit above.</EmptyState>
          ) : (
            <ul className="divide-y divide-white/[0.07]">
              {[...drafts, ...posted].map((p) => (
                <li key={p.id} className={cn('space-y-2 px-4 py-4', !p.consentOk && 'bg-tornado/[0.08]')}>
                  <p className="flex flex-wrap items-center gap-2 text-[13px]">
                    <span className="font-semibold text-[#F0F0F0]">{PLATFORM_LABEL[p.platform]}</span>
                    {p.publishedAt ? (
                      <span className="text-[11px] font-bold uppercase text-[#2ECC71]">
                        Posted {formatBusinessDate(new Date(p.publishedAt), { month: 'short', day: 'numeric' })}
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold uppercase text-[#8A8A8F]">Draft</span>
                    )}
                    {!p.consentOk ? <span className="text-[11px] font-bold uppercase text-[#F1948A]">Consent withdrawn — do not post</span> : null}
                  </p>
                  <PostEditor postId={p.id} caption={p.caption ?? ''} posted={Boolean(p.publishedAt)} consentOk={p.consentOk} />
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Promo codes" subtitle="Discounts for launch posts, flyers and partners">
          <PromoCodes promos={promos} />
        </Panel>
      </main>
    </>
  )
}
