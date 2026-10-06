'use client'

import { MapPin, Navigation } from 'lucide-react'
import { useState } from 'react'

import { useRunAction } from '@/components/sweeper/run/useRunAction'

type Position = { lat: number; lng: number; accuracy: number }

function currentPosition(): Promise<Position | null> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(null)
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 30_000 }
    )
  })
}

/** "On my way" (texts the customer) then "Arrived — start job" (GPS-checked). */
export function ArrivalActions({ jobId, enRoute }: { jobId: string; enRoute: boolean }): React.ReactElement {
  const { run, busy, error } = useRunAction(jobId)
  const [locating, setLocating] = useState(false)
  const [noLocation, setNoLocation] = useState(false)

  async function arrive(allowWithoutLocation: boolean): Promise<void> {
    setLocating(true)
    const position = await currentPosition()
    setLocating(false)
    if (!position && !allowWithoutLocation) {
      setNoLocation(true)
      return
    }
    await run({ action: 'arrive', position })
  }

  const btn = 'flex h-14 w-full items-center justify-center gap-2 rounded-xl font-[family-name:var(--font-barlow-condensed)] text-lg font-bold uppercase tracking-wider text-white disabled:opacity-60'

  return (
    <div className="space-y-3">
      {!enRoute ? (
        <button type="button" disabled={busy} onClick={() => void run({ action: 'en_route' })} className={`${btn} bg-white/[0.08] hover:bg-white/[0.12]`}>
          <Navigation className="size-5" aria-hidden="true" /> {busy ? 'Sending…' : 'On my way'}
        </button>
      ) : (
        <p className="text-center text-xs text-[#9A9A9F]">Customer was texted that you&apos;re on the way.</p>
      )}
      <button type="button" disabled={busy || locating} onClick={() => void arrive(false)} className={`${btn} bg-sky hover:bg-sky-light`}>
        <MapPin className="size-5" aria-hidden="true" /> {locating ? 'Checking location…' : busy ? 'Starting…' : 'Arrived — start job'}
      </button>
      {noLocation ? (
        <div className="space-y-2 rounded-lg border border-[#E67E22]/40 bg-[#E67E22]/10 p-3 text-xs text-[#F0B27A]">
          <p>Couldn&apos;t get your location. Turn on location for this site and try again — arrivals without location are flagged for the office.</p>
          <button type="button" onClick={() => void arrive(true)} disabled={busy} className="font-bold underline">
            Start without location
          </button>
        </div>
      ) : null}
      {error ? <p role="alert" className="text-sm font-semibold text-[#F1948A]">{error}</p> : null}
    </div>
  )
}
