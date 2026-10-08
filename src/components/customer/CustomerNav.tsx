'use client'

import { CalendarCheck, Home, Image as ImageIcon, LogOut, ShieldCheck, User } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'

import { currentPreview, exitPreview } from '@/lib/previewClient'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/history', label: 'Visits', icon: CalendarCheck },
  { href: '/photos', label: 'Photos', icon: ImageIcon },
  { href: '/membership', label: 'Membership', icon: ShieldCheck },
  { href: '/account', label: 'Account', icon: User },
] as const

export function CustomerNav(): React.ReactElement {
  const pathname = usePathname()
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)

  async function signOut(): Promise<void> {
    setSigningOut(true)
    if (currentPreview()) return exitPreview()
    await createClient().auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const isActive = (href: string): boolean => pathname === href || pathname.startsWith(`${href}/`)

  return (
    <>
      {/* Desktop / tablet: top bar */}
      <nav aria-label="Account" className="hidden items-center gap-1 md:flex">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive(item.href) ? 'page' : undefined}
            className={cn(
              'rounded-md px-3 py-2 text-sm font-semibold transition-colors',
              isActive(item.href) ? 'bg-sky/10 text-sky-dark' : 'text-[#4A4A50] hover:bg-black/5 hover:text-shelter'
            )}
          >
            {item.label}
          </Link>
        ))}
        <button
          type="button"
          onClick={() => void signOut()}
          disabled={signingOut}
          className="ml-1 inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-semibold text-[#6B6B70] hover:bg-black/5 disabled:opacity-50"
        >
          <LogOut className="size-4" aria-hidden="true" /> Sign out
        </button>
      </nav>

      {/* Phones: bottom tab bar */}
      <nav aria-label="Account" className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-black/10 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive(item.href) ? 'page' : undefined}
            className={cn(
              'flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold',
              isActive(item.href) ? 'text-sky-dark' : 'text-[#6B6B70]'
            )}
          >
            <item.icon className="size-5" aria-hidden="true" />
            {item.label}
          </Link>
        ))}
      </nav>
    </>
  )
}

export function MobileSignOut(): React.ReactElement {
  const router = useRouter()
  return (
    <button
      type="button"
      onClick={() => (currentPreview() ? void exitPreview() : void createClient().auth.signOut().then(() => { router.push('/login'); router.refresh() }))}
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-semibold text-[#6B6B70] hover:bg-black/5 md:hidden"
    >
      <LogOut className="size-4" aria-hidden="true" /> Sign out
    </button>
  )
}
