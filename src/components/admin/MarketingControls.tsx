'use client'

import { Check, Copy } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'tiktok', label: 'TikTok' },
] as const

async function send(url: string, method: string, body?: unknown): Promise<string | null> {
  try {
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
    if (!res.ok) return ((await res.json()) as { error?: string }).error ?? 'Could not save'
    return null
  } catch {
    return 'Could not reach the server'
  }
}

export function DraftPostButtons({ jobId }: { jobId: string }): React.ReactElement {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] text-[#8A8A8F]">Draft for</span>
      {PLATFORMS.map((p) => (
        <button
          key={p.id}
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            const err = await send('/api/admin/marketing', 'POST', { jobId, platform: p.id })
            setBusy(false)
            setError(err)
            if (!err) router.refresh()
          }}
          className="h-7 rounded-md bg-white/[0.06] px-2.5 text-[11px] font-semibold text-[#F0F0F0] hover:bg-white/[0.12] disabled:opacity-50"
        >
          {p.label}
        </button>
      ))}
      {error ? <p role="alert" className="w-full text-[11px] text-[#F1948A]">{error}</p> : null}
    </div>
  )
}

export function PostEditor({
  postId,
  caption,
  posted,
  consentOk,
}: {
  postId: string
  caption: string
  posted: boolean
  consentOk: boolean
}): React.ReactElement {
  const router = useRouter()
  const [text, setText] = useState(caption)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function act(method: string, body?: unknown): Promise<void> {
    setBusy(true)
    const err = await send(`/api/admin/marketing/${postId}`, method, body)
    setBusy(false)
    setError(err)
    if (!err) router.refresh()
  }

  const btn = 'h-8 rounded-md px-3 text-xs font-semibold disabled:opacity-50'
  return (
    <div className="space-y-2">
      <label className="sr-only" htmlFor={`cap-${postId}`}>Caption</label>
      <textarea
        id={`cap-${postId}`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        maxLength={2200}
        className="w-full rounded-md border border-white/10 bg-[#0F0F11] p-2.5 text-[13px] text-[#F0F0F0] outline-none focus-visible:border-sky"
      />
      <div className="flex flex-wrap items-center gap-2">
        {text !== caption ? (
          <button type="button" disabled={busy} onClick={() => void act('PATCH', { action: 'caption', caption: text })} className={`${btn} bg-white/[0.08] text-[#F0F0F0]`}>
            Save caption
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(text).then(
              () => {
                setCopied(true)
                window.setTimeout(() => setCopied(false), 2000)
              },
              () => setError('Copy failed — select the text instead')
            )
          }}
          className={`${btn} inline-flex items-center gap-1 bg-white/[0.06] text-[#F0F0F0]`}
        >
          {copied ? <Check className="size-3.5" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
          {copied ? 'Copied' : 'Copy caption'}
        </button>
        {posted ? (
          <button type="button" disabled={busy} onClick={() => void act('PATCH', { action: 'unposted' })} className={`${btn} text-[#9A9A9F] hover:bg-white/[0.06]`}>
            Undo posted
          </button>
        ) : (
          <button type="button" disabled={busy || !consentOk} onClick={() => void act('PATCH', { action: 'posted' })} className={`${btn} bg-sky text-white hover:bg-sky-light`}>
            Mark posted
          </button>
        )}
        {confirmDelete ? (
          <span className="inline-flex items-center gap-1">
            <button type="button" disabled={busy} onClick={() => void act('DELETE')} className={`${btn} bg-tornado text-white`}>Delete</button>
            <button type="button" onClick={() => setConfirmDelete(false)} className={`${btn} text-[#9A9A9F]`}>Keep</button>
          </span>
        ) : (
          <button type="button" onClick={() => setConfirmDelete(true)} className={`${btn} text-[#9A9A9F] hover:bg-white/[0.06]`}>
            Delete draft
          </button>
        )}
      </div>
      {error ? <p role="alert" className="text-[11px] text-[#F1948A]">{error}</p> : null}
    </div>
  )
}
