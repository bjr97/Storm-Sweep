import Link from 'next/link'
import { redirect } from 'next/navigation'

import { CustomerNav, MobileSignOut } from '@/components/customer/CustomerNav'
import { LiveRefresh } from '@/components/live/LiveRefresh'
import { PreviewBanner } from '@/components/preview/PreviewBanner'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function CustomerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>): Promise<React.ReactElement> {
  // Middleware gates these paths; re-check so a matcher mistake can't expose data.
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirectTo=/dashboard')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'customer') redirect('/login')

  return (
    <div className="min-h-screen bg-[#F7F7F4] font-[family-name:var(--font-barlow)] text-shelter">
      <PreviewBanner />
      <header className="sticky top-0 z-10 border-b border-black/10 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
          <Link href="/dashboard" className="font-[family-name:var(--font-bebas)] text-2xl tracking-[0.06em] text-shelter">
            STORM<span className="text-sky">SWEEP</span>
          </Link>
          <CustomerNav />
          <LiveRefresh className="hidden" />
          <MobileSignOut />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 pb-28 pt-6 md:pb-12">{children}</main>
    </div>
  )
}
