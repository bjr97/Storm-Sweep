'use client'

import {
  Banknote,
  CalendarDays,
  DollarSign,
  Eye,
  Handshake,
  HardHat,
  Home,
  LayoutDashboard,
  LogOut,
  MapPin,
  Megaphone,
  Rocket,
  Star,
  UserPlus,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'

import { LiveRefresh } from '@/components/live/LiveRefresh'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

type NavItem = { label: string; icon: LucideIcon; href: string; built: boolean }

const NAV_SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, href: '/admin', built: true },
      { label: 'Launch checklist', icon: Rocket, href: '/admin/launch', built: true },
      { label: 'Schedule', icon: CalendarDays, href: '/admin/schedule', built: true },
      { label: 'All Jobs', icon: Wrench, href: '/admin/jobs', built: true },
      { label: 'View as', icon: Eye, href: '/admin/view-as', built: true },
    ],
  },
  {
    label: 'People',
    items: [
      { label: 'Customers', icon: Users, href: '/admin/customers', built: true },
      { label: 'Crew', icon: HardHat, href: '/admin/crew', built: true },
      { label: 'Applicants', icon: UserPlus, href: '/admin/sweepers', built: true },
      { label: 'Reviews', icon: Star, href: '/admin/reviews', built: true },
    ],
  },
  {
    label: 'Business',
    items: [
      { label: 'Revenue', icon: DollarSign, href: '/admin/revenue', built: true },
      { label: 'Payouts', icon: Banknote, href: '/admin/payouts', built: true },
      { label: 'Marketing', icon: Megaphone, href: '/admin/marketing', built: true },
      { label: 'Partners', icon: Handshake, href: '/admin/partners', built: true },
      { label: 'Service area', icon: MapPin, href: '/admin/service-area', built: true },
    ],
  },
]

type AdminSidebarProps = { adminName: string }

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'SS'
  )
}

export function AdminSidebar({ adminName }: AdminSidebarProps): React.ReactElement {
  const pathname = usePathname()
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut(): Promise<void> {
    setSigningOut(true)
    await createClient().auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="hidden h-screen w-56 shrink-0 flex-col overflow-y-auto border-r border-white/[0.07] bg-[#141416] lg:flex">
      <div className="border-b border-white/[0.07] px-5 pb-5 pt-6">
        <div className="flex items-center gap-2">
          <Link
            href="/admin"
            className="font-[family-name:var(--font-bebas)] text-2xl leading-none tracking-[0.08em] text-white"
          >
            STORM<span className="text-sky-light">SWEEP</span>
          </Link>
          <Link
            href="/"
            aria-label="Go to the public website"
            title="Go to the public website"
            className="rounded-md p-1 text-[#9A9A9F] transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky"
          >
            <Home className="size-4" aria-hidden="true" />
          </Link>
        </div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="font-[family-name:var(--font-barlow)] text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8A8A8F]">
            Admin · Norman OK
          </p>
          <LiveRefresh />
        </div>
      </div>

      <nav className="flex-1 font-[family-name:var(--font-barlow)]">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="px-3 pb-2 pt-4">
            <p className="mb-1.5 px-2 text-[9px] font-bold uppercase tracking-[0.3em] text-[#8A8A8F]">
              {section.label}
            </p>
            {section.items.map((item) => {
              const active = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href)
              const content = (
                <>
                  <item.icon className="size-4 shrink-0" aria-hidden="true" />
                  <span className="flex-1">{item.label}</span>
                  {!item.built ? (
                    <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#8A8A8F]">
                      Soon
                    </span>
                  ) : null}
                </>
              )
              const base = 'mb-0.5 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px]'

              return item.built ? (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    base,
                    'transition-colors',
                    active
                      ? 'bg-sky/15 font-semibold text-sky-light'
                      : 'font-medium text-[#9A9A9F] hover:bg-white/[0.04] hover:text-white'
                  )}
                >
                  {content}
                </Link>
              ) : (
                <div
                  key={item.href}
                  aria-disabled="true"
                  className={cn(base, 'cursor-default font-medium text-[#9A9A9F]/60')}
                >
                  {content}
                </div>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-white/[0.07] p-3 font-[family-name:var(--font-barlow)]">
        <div className="flex items-center gap-2.5 rounded-lg p-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky to-sky-dark font-[family-name:var(--font-bebas)] text-[13px] tracking-wider text-white">
            {initials(adminName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-[#F0F0F0]">{adminName}</p>
            <p className="text-[10px] text-[#8A8A8F]">Owner · Admin</p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            aria-label="Sign out"
            title="Sign out"
            className="rounded-md p-1.5 text-[#9A9A9F] transition-colors hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
          >
            <LogOut className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </aside>
  )
}
