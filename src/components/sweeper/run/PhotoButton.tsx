'use client'

import { Camera, Video } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'

import { uploadJobMedia } from '@/components/sweeper/run/useRunAction'
import type { MediaKind } from '@/lib/sweepers/jobRun'
import { cn } from '@/lib/utils'

/** Opens the phone camera, uploads, and refreshes. */
export function PhotoButton({
  jobId,
  kind,
  checklistItem = null,
  label,
  disabled,
  done,
}: {
  jobId: string
  kind: MediaKind
  checklistItem?: string | null
  label: string
  disabled?: boolean
  done?: boolean
}): React.ReactElement {
  const router = useRouter()
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isVideo = kind.startsWith('video_')

  async function onFile(file: File | undefined): Promise<void> {
    if (!file) return
    setBusy(true)
    setError(null)
    const result = await uploadJobMedia(jobId, kind, file, checklistItem)
    setBusy(false)
    if (input.current) input.current.value = ''
    if (!result.ok) setError(result.error)
    else router.refresh()
  }

  const Icon = isVideo ? Video : Camera
  return (
    <div>
      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => input.current?.click()}
        className={cn(
          'inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-xs font-bold disabled:opacity-50',
          done ? 'bg-white/[0.06] text-[#C9C9CE] hover:bg-white/[0.1]' : 'bg-sky text-white hover:bg-sky-light'
        )}
      >
        <Icon className="size-4" aria-hidden="true" />
        {busy ? 'Uploading…' : label}
      </button>
      <input
        ref={input}
        type="file"
        accept={isVideo ? 'video/*' : 'image/*'}
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => void onFile(e.target.files?.[0])}
      />
      {error ? <p role="alert" className="mt-1 text-xs font-semibold text-[#F1948A]">{error}</p> : null}
    </div>
  )
}
