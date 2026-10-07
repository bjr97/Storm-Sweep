import Link from 'next/link'

import { formatBusinessDate } from '@/lib/admin/time'
import { currentCustomerId, getCustomerProfile, getPhotoGallery } from '@/lib/customer/portal'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'My Photos · Storm Sweep' }

export default async function CustomerPhotosPage(): Promise<React.ReactElement> {
  const userId = (await currentCustomerId())!
  const [gallery, profile] = await Promise.all([getPhotoGallery(userId), getCustomerProfile(userId)])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-bebas)] text-4xl tracking-wide">My photos</h1>
        <p className="text-sm text-[#6B6B70]">
          Before &amp; after from every visit. Marketing use:{' '}
          <b>{profile?.marketing_photo_consent ? 'allowed' : 'not allowed'}</b> —{' '}
          <Link href="/account#photo-consent" className="font-semibold text-sky-dark hover:underline">change</Link>
        </p>
      </div>

      {gallery.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-black/15 bg-white p-8 text-center text-sm text-[#6B6B70]">
          Photos appear here after your first visit.
        </p>
      ) : (
        gallery.map((visit) => (
          <section key={visit.jobId} className="space-y-3 rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="font-[family-name:var(--font-bebas)] text-2xl tracking-wide">
                {visit.date ? formatBusinessDate(new Date(visit.date), { month: 'long', day: 'numeric', year: 'numeric' }) : 'Visit'}
              </h2>
              <Link href={`/history/${visit.jobId}`} className="text-sm font-semibold text-sky-dark hover:underline">Report</Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {(['before', 'after'] as const).map((side) => (
                <div key={side} className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#6B6B70]">{side}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {visit[side].map((m) =>
                      m.url ? (
                        <a key={m.id} href={m.url} target="_blank" rel="noreferrer" className="overflow-hidden rounded-lg bg-black/5">
                          {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URL */}
                          <img src={m.url} alt={`${side} photo`} className="aspect-square w-full object-cover" />
                        </a>
                      ) : null
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  )
}
