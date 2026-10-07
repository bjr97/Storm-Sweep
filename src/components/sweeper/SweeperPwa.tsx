'use client'

import { WifiOff } from 'lucide-react'
import { useEffect, useState } from 'react'

/** Registers the Sweeper service worker and shows a banner while offline. */
export function SweeperPwa(): React.ReactElement | null {
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sweeper-sw.js', { scope: '/sweeper/' }).catch(() => {
        // Not fatal: the app works normally, just without the offline page.
      })
    }
    const update = (): void => setOffline(!navigator.onLine)
    update()
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  if (!offline) return null
  return (
    <div role="status" className="sticky top-14 z-10 flex items-center justify-center gap-2 bg-[#E67E22] px-4 py-2 text-center text-xs font-bold text-shelter">
      <WifiOff className="size-4 shrink-0" aria-hidden="true" />
      No signal — changes won&apos;t save until you&apos;re back online.
    </div>
  )
}
