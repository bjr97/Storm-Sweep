'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'

import { createClient } from '@/lib/supabase/client'
import { MAX_PHOTO_BYTES, MAX_VIDEO_BYTES, MAX_VIDEO_SECONDS, type MediaKind } from '@/lib/sweepers/jobRun'

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string }

export async function postRunAction<T = unknown>(jobId: string, body: Record<string, unknown>): Promise<ActionResult<T>> {
  try {
    const res = await fetch(`/api/jobs/${jobId}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = (await res.json()) as { data?: T; error?: string }
    if (!res.ok) return { ok: false, error: json.error ?? 'Something went wrong' }
    return { ok: true, data: json.data as T }
  } catch {
    return { ok: false, error: 'No connection — try again' }
  }
}

/** POSTs a job-run action, tracks busy/error, refreshes server data on success. */
export function useRunAction(jobId: string): {
  run: <T = unknown>(body: Record<string, unknown>) => Promise<ActionResult<T>>
  busy: boolean
  error: string | null
  setError: (e: string | null) => void
} {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const run = useCallback(
    async <T,>(body: Record<string, unknown>): Promise<ActionResult<T>> => {
      setBusy(true)
      setError(null)
      const result = await postRunAction<T>(jobId, body)
      setBusy(false)
      if (result.ok) router.refresh()
      else setError(result.error)
      return result
    },
    [jobId, router]
  )
  return { run, busy, error, setError }
}

/** Shrinks a phone photo to ≤1600px JPEG so uploads are quick on cell data. */
async function compressImage(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82))
    return blob ?? file
  } catch {
    return file // e.g. HEIC the browser can't decode — upload as-is if allowed
  }
}

function videoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const v = document.createElement('video')
    v.preload = 'metadata'
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(v.src)
      resolve(v.duration)
    }
    v.onerror = () => resolve(0)
    v.src = URL.createObjectURL(file)
  })
}

/** Upload straight to storage with a one-time signed URL, then register it on the job. */
export async function uploadJobMedia(
  jobId: string,
  kind: MediaKind,
  file: Blob,
  checklistItem: string | null = null
): Promise<ActionResult<{ path: string }>> {
  let blob: Blob = file
  let contentType = file.type || 'image/jpeg'
  if (kind.startsWith('video_')) {
    if (file instanceof File && (await videoDuration(file)) > MAX_VIDEO_SECONDS + 1) {
      return { ok: false, error: `Keep videos under ${MAX_VIDEO_SECONDS} seconds` }
    }
    if (file.size > MAX_VIDEO_BYTES) return { ok: false, error: 'Video is too large — record a shorter clip (about 30 seconds)' }
  } else if (kind !== 'signature') {
    blob = file instanceof File ? await compressImage(file) : file
    contentType = blob.type || 'image/jpeg'
    if (blob.size > MAX_PHOTO_BYTES) return { ok: false, error: 'Photo is too large' }
  }

  const ticket = await postRunAction<{ bucket: string; path: string; token: string }>(jobId, {
    action: 'upload_url',
    kind,
    contentType,
  })
  if (!ticket.ok) return ticket
  const { error } = await createClient()
    .storage.from(ticket.data.bucket)
    .uploadToSignedUrl(ticket.data.path, ticket.data.token, blob, { contentType })
  if (error) return { ok: false, error: 'Upload failed — check your signal and try again' }

  if (kind === 'signature') return { ok: true, data: { path: ticket.data.path } }
  const reg = await postRunAction(jobId, { action: 'register_media', kind, path: ticket.data.path, checklistItem })
  if (!reg.ok) return reg
  return { ok: true, data: { path: ticket.data.path } }
}
