'use client'

import { CalendarDays, DollarSign, GraduationCap, LayoutList } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'

const NAV = [
  { href: '/sweeper', label: 'Jobs', icon: LayoutList, exact: true },
  { href: '/sweeper/schedule', label: 'Schedule', icon: CalendarDays, exact: false },
  { href: '/sweeper/earnings', label: 'Earnings', icon: DollarSign, exact: false },
  { href: '/sweeper/training', label: 'Guide', icon: GraduationCap, exact: false },
] as const

/** Bottom tab bar (thumb reach on phones). */
export function SweeperNav(): React.ReactElement {
  const pathname = usePathname()
  const active = (href: string, exact: boolean): boolean =>
    exact ? pathname === href || pathname.startsWith('/sweeper/jobs') : pathname.startsWith(href)
  return (
    <nav
      aria-label="Sweeper"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-white/[0.07] bg-[#141416]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <div className="mx-auto grid max-w-2xl grid-cols-4">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active(item.href, item.exact) ? 'page' : undefined}
            className={cn(
              'flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold',
              active(item.href, item.exact) ? 'text-sky-light' : 'text-[#8A8A8F] hover:text-white'
            )}
          >
            <item.icon className="size-5" aria-hidden="true" />
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
