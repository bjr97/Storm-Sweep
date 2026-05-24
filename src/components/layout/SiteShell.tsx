'use client'

import { usePathname } from 'next/navigation'

import { Footer } from '@/components/layout/Footer'
import { Navbar } from '@/components/layout/Navbar'

const AUTH_PATHS = new Set(['/login', '/register'])

export function SiteShell({
  children,
}: Readonly<{
  children: React.ReactNode
}>): React.ReactElement {
  const pathname = usePathname()
  const isAuthPage = AUTH_PATHS.has(pathname)

  if (isAuthPage) {
    return (
      <div className="min-h-screen bg-[#F7F7F4] font-body text-foreground">
        {children}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] font-body text-[var(--color-text)]">
      <Navbar />
      <main>{children}</main>
      <Footer />
    </div>
  )
}
