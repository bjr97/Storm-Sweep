'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export type JobPatch = {
  sweeperId?: string | null
  status?: 'pending' | 'confirmed' | 'cancelled'
  approvePhoto?: true
}

/** PATCHes /api/jobs/[id] and refreshes the server-rendered page on success. */
export function useJobUpdate(jobId: string): {
  update: (patch: JobPatch) => Promise<boolean>
  saving: boolean
  error: string | null
} {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function update(patch: JobPatch): Promise<boolean> {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      const body = (await res.json()) as { error?: string }
      if (!res.ok) {
        setError(body.error ?? 'Update failed')
        return false
      }
      router.refresh()
      return true
    } catch {
      setError('Could not reach the server')
      return false
    } finally {
      setSaving(false)
    }
  }

  return { update, saving, error }
}
