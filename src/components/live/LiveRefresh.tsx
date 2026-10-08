'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const TOPIC = 'jobs-changes'
/** Coalesce bursts (one save can touch several rows) into one refresh. */
const DEBOUNCE_MS = 1200
/** If Realtime can't connect, fall back to checking this often while visible. */
const FALLBACK_POLL_MS = 60_000

/**
 * Re-fetches the current page's server data whenever a job changes anywhere
 * (migration 021 broadcasts an empty ping). Each page still loads only what
 * its viewer is allowed to see. Shows a small "Live" dot when connected.
 */
export function LiveRefresh({ className }: { className?: string }): React.ReactElement {
  const router = useRouter()
  const [live, setLive] = useState(false)
  const pending = useRef(false)
  const timer = useRef<number | null>(null)

  useEffect(() => {
    const supabase = createClient()
    let poll: number | null = null

    const refresh = (): void => {
      if (document.visibilityState !== 'visible') {
        pending.current = true // catch up when the tab is shown again
        return
      }
      if (timer.current) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => {
        pending.current = false
        router.refresh()
      }, DEBOUNCE_MS)
    }
    const onVisible = (): void => {
      if (document.visibilityState === 'visible' && pending.current) refresh()
    }
    document.addEventListener('visibilitychange', onVisible)

    const channel = supabase.channel(TOPIC, { config: { private: true } })
    void supabase.realtime.setAuth().then(() => {
      channel
        .on('broadcast', { event: 'changed' }, refresh)
        .subscribe((status) => {
          const ok = status === 'SUBSCRIBED'
          setLive(ok)
          if (ok && poll) {
            window.clearInterval(poll)
            poll = null
          }
          if (!ok && !poll && (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED')) {
            poll = window.setInterval(() => {
              if (document.visibilityState === 'visible') router.refresh()
            }, FALLBACK_POLL_MS)
          }
        })
    })

    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      if (timer.current) window.clearTimeout(timer.current)
      if (poll) window.clearInterval(poll)
      void supabase.removeChannel(channel)
    }
  }, [router])

  return (
    <span
      className={cn('inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.15em]', live ? 'text-[#2ECC71]' : 'text-[#8A8A8F]', className)}
      title={live ? 'Live: this page updates on its own' : 'Connecting…'}
    >
      <span className={cn('size-1.5 rounded-full', live ? 'animate-pulse bg-[#2ECC71]' : 'bg-[#8A8A8F]')} aria-hidden="true" />
      {live ? 'Live' : ''}
      <span className="sr-only">{live ? 'This page updates automatically' : 'Connecting to live updates'}</span>
    </span>
  )
}
