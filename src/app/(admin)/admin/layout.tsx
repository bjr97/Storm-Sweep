import { Home } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>): Promise<React.ReactElement> {
  // Middleware already gates /admin; re-check here so a misconfigured matcher
  // can never expose admin data.
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirectTo=/admin')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/login')
  }

  const adminName = profile.full_name ?? 'Storm Sweep Admin'

  return (
    <div className="flex h-screen overflow-hidden bg-[#0F0F11] font-[family-name:var(--font-barlow)] text-[#F0F0F0]">
      <AdminSidebar adminName={adminName} />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-12 items-center border-b border-white/[0.07] bg-[#141416] px-4 lg:hidden">
          <Link
            href="/admin"
            className="font-[family-name:var(--font-bebas)] text-xl tracking-[0.08em] text-white"
          >
            STORM<span className="text-sky-light">SWEEP</span>
            <span className="ml-2 font-[family-name:var(--font-barlow)] text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8A8A8F]">
              Admin
            </span>
          </Link>
          <Link
            href="/"
            aria-label="Go to the public website"
            title="Go to the public website"
            className="ml-2 rounded-md p-1 text-[#9A9A9F] transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky"
          >
            <Home className="size-4" aria-hidden="true" />
          </Link>
        </div>
        {children}
      </div>
    </div>
  )
}
