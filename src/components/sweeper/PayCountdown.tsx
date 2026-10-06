'use client'

import { useEffect, useState } from 'react'

import { claimPct, nextPctDrop } from '@/lib/sweepers/jobBoard'

const fmt = (ms: number): string => {
  const mins = Math.max(1, Math.ceil(ms / 60_000))
  return mins < 90 ? `${mins} min` : `${Math.round(mins / 60)} hr`
}

/** "68% rate for 42 min more" — recomputed every 30s from when the job opened to you. */
export function PayCountdown({ visibleAt }: { visibleAt: string }): React.ReactElement {
  const [now, setNow] = useState<number>(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(id)
  }, [])
  const opened = new Date(visibleAt)
  const drop = nextPctDrop(opened, new Date(now))
  return (
    <span>
      {Math.round(claimPct(now - opened.getTime()) * 100)}% rate
      {drop ? ` for ${fmt(drop.at.getTime() - now)} more` : ''}
    </span>
  )
}
