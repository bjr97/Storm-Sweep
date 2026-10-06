'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

/** Re-fetches the board every minute (jobs open to new tiers, speed pay steps down). */
export function BoardAutoRefresh({ everyMs = 60_000 }: { everyMs?: number }): null {
  const router = useRouter()
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh()
    }, everyMs)
    return () => window.clearInterval(id)
  }, [router, everyMs])
  return null
}
