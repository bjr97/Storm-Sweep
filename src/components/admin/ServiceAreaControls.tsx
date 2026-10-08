'use client'

import { X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

const field = 'h-8 rounded-md border border-white/10 bg-[#0F0F11] px-2 text-xs text-[#F0F0F0]'

async function send(method: 'POST' | 'DELETE' | 'PATCH', url: string, body: unknown): Promise<string | null> {
  try {
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    return res.ok ? null : (((await res.json()) as { error?: string }).error ?? 'Something went wrong')
  } catch {
    return 'Could not reach the server'
  }
}

/** Add a ZIP (optionally from the waitlist table). */
export function AddZipForm({ suggested }: { suggested?: string }): React.ReactElement {
  const router = useRouter()
  const [zip, setZip] = useState(suggested ?? '')
  const [label, setLabel] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-[11px] text-[#9A9A9F]">
          ZIP
          <input value={zip} onChange={(e) => setZip(e.target.value.replace(/\D/g, '').slice(0, 5))} inputMode="numeric" placeholder="73160" className={`${field} mt-1 block w-20`} />
        </label>
        <label className="text-[11px] text-[#9A9A9F]">
          Name (optional)
          <input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={60} placeholder="Moore" className={`${field} mt-1 block w-36`} />
        </label>
        <button
          type="button"
          disabled={busy || zip.length !== 5}
          onClick={async () => {
            setBusy(true)
            setError(await send('POST', '/api/admin/service-area', { zip, label: label.trim() || undefined }))
            setBusy(false)
            setZip('')
            setLabel('')
            router.refresh()
          }}
          className="h-8 rounded-md bg-sky px-3 text-xs font-bold text-white hover:bg-sky-light disabled:opacity-50"
        >
          {busy ? 'Adding…' : 'Add ZIP'}
        </button>
      </div>
      {error ? <p role="alert" className="text-[11px] text-[#F1948A]">{error}</p> : null}
    </div>
  )
}

export function RemoveZipButton({ zip }: { zip: string }): React.ReactElement {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  return (
    <button
      type="button"
      disabled={busy}
      aria-label={`Stop booking ${zip} online`}
      title="Remove"
      onClick={async () => {
        setBusy(true)
        await send('DELETE', '/api/admin/service-area', { zip })
        router.refresh()
      }}
      className="rounded p-0.5 text-[#8A8A8F] hover:bg-white/[0.08] hover:text-white disabled:opacity-50"
    >
      <X className="size-3.5" aria-hidden="true" />
    </button>
  )
}

/** One-tap: add a waitlisted ZIP to the service area. */
export function OpenZipButton({ zip }: { zip: string }): React.ReactElement {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true)
        await send('POST', '/api/admin/service-area', { zip })
        router.refresh()
      }}
      className="rounded-md border border-white/10 px-2 py-1 text-[11px] font-semibold text-sky-light hover:bg-white/[0.06] disabled:opacity-50"
    >
      {busy ? 'Adding…' : 'Start serving'}
    </button>
  )
}

export function MarkContactedButton({ zip, pending }: { zip: string; pending: number }): React.ReactElement {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  if (pending === 0) return <span className="text-[11px] text-[#8A8A8F]">All contacted</span>
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true)
        await send('PATCH', '/api/admin/waitlist', { zip })
        router.refresh()
      }}
      className="rounded-md border border-white/10 px-2 py-1 text-[11px] font-semibold text-[#C9C9CE] hover:bg-white/[0.06] disabled:opacity-50"
    >
      {busy ? 'Saving…' : `Mark ${pending} contacted`}
    </button>
  )
}
