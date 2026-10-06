'use client'

import { AlertTriangle, Camera } from 'lucide-react'
import { useRef, useState } from 'react'

import { uploadJobMedia, useRunAction } from '@/components/sweeper/run/useRunAction'
import { ISSUE_KINDS } from '@/lib/sweepers/jobRun'
import type { JobIssueKind } from '@/types/database'

/** "Report a problem" — pauses the job and alerts the office. */
export function IssueReporter({ jobId, disabled }: { jobId: string; disabled?: boolean }): React.ReactElement {
  const { run, busy, error, setError } = useRunAction(jobId)
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<JobIssueKind>('standing_water')
  const [note, setNote] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  async function submit(): Promise<void> {
    let photoPath: string | null = null
    if (photo) {
      setUploading(true)
      const up = await uploadJobMedia(jobId, 'issue', photo)
      setUploading(false)
      if (!up.ok) {
        setError(up.error)
        return
      }
      photoPath = up.data.path
    }
    const res = await run({ action: 'report_issue', kind, note: note.trim() || null, photoPath })
    if (res.ok) setOpen(false)
  }

  if (!open) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-tornado/50 font-semibold text-[#F1948A] hover:bg-tornado/10 disabled:opacity-50"
      >
        <AlertTriangle className="size-5" aria-hidden="true" /> Report a problem
      </button>
    )
  }

  return (
    <div className="space-y-3 rounded-xl border border-tornado/50 bg-tornado/10 p-4">
      <p className="text-sm text-[#F0F0F0]">
        Stop work. The job pauses and the office is alerted. Wait for their OK before continuing.
      </p>
      <label className="block text-sm text-[#F0F0F0]">
        <span className="font-semibold">What did you find?</span>
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as JobIssueKind)}
          className="mt-1 h-11 w-full rounded-lg border border-white/15 bg-[#0F0F11] px-3 text-sm"
        >
          {ISSUE_KINDS.map((k) => (
            <option key={k.value} value={k.value}>{k.label}</option>
          ))}
        </select>
      </label>
      <label className="block text-sm text-[#F0F0F0]">
        <span className="font-semibold">Details</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          rows={3}
          className="mt-1 w-full rounded-lg border border-white/15 bg-[#0F0F11] p-3 text-sm"
          placeholder="e.g. about 4 inches of water on the floor"
        />
      </label>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="inline-flex h-10 items-center gap-1.5 rounded-md bg-white/[0.08] px-3 text-sm font-semibold text-[#F0F0F0]"
        >
          <Camera className="size-4" aria-hidden="true" /> {photo ? 'Retake photo' : 'Add photo'}
        </button>
        {photo ? <span className="text-xs text-[#9A9A9F]">Photo ready</span> : null}
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void submit()}
          disabled={busy || uploading}
          className="h-12 flex-1 rounded-lg bg-tornado font-bold text-white hover:bg-tornado/90 disabled:opacity-60"
        >
          {uploading ? 'Uploading photo…' : busy ? 'Sending…' : 'Pause job & alert office'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="h-12 rounded-lg px-4 font-semibold text-[#C9C9CE] hover:bg-white/10">
          Cancel
        </button>
      </div>
      {error ? <p role="alert" className="text-sm font-semibold text-[#F1948A]">{error}</p> : null}
    </div>
  )
}
