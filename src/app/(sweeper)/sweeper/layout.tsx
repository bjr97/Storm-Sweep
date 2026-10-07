import Link from 'next/link'
import { redirect } from 'next/navigation'

import { SignOutButton } from '@/components/sweeper/SignOutButton'
import { SweeperNav } from '@/components/sweeper/SweeperNav'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function SweeperLayout({
  children,
}: Readonly<{ children: React.ReactNode }>): Promise<React.ReactElement> {
  // Middleware already gates /sweeper; re-check so a matcher mistake can't expose jobs.
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirectTo=/sweeper')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'sweeper') redirect('/login')

  return (
    <div className="min-h-screen bg-[#0F0F11] font-[family-name:var(--font-barlow)] text-[#F0F0F0]">
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-white/[0.07] bg-[#141416]/95 px-4 backdrop-blur">
        <Link href="/sweeper" className="font-[family-name:var(--font-bebas)] text-xl tracking-[0.08em] text-white">
          STORM<span className="text-sky-light">SWEEP</span>
          <span className="ml-2 font-[family-name:var(--font-barlow)] text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8A8A8F]">
            Sweeper
          </span>
        </Link>
        <SignOutButton />
      </header>
      <div className="mx-auto w-full max-w-2xl pb-20">{children}</div>
      <SweeperNav />
    </div>
  )
}
