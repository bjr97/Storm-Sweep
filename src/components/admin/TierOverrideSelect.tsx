'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { TIER_LABEL } from '@/lib/sweepers/jobBoard'
import type { SweeperTier } from '@/types/database'

export function TierOverrideSelect({
  sweeperId,
  override,
  autoTier,
}: {
  sweeperId: string
  override: SweeperTier | null
  autoTier: SweeperTier
}): React.ReactElement {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save(value: string): Promise<void> {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/sweepers/${sweeperId}/tier`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ override: value || null }),
      })
      if (!res.ok) {
        setError(((await res.json()) as { error?: string }).error ?? 'Could not save')
        return
      }
      router.refresh()
    } catch {
      setError('Could not save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <select
        aria-label="Tier"
        value={override ?? ''}
        disabled={saving}
        onChange={(e) => void save(e.target.value)}
        className="h-8 w-full rounded-md border border-white/10 bg-[#0F0F11] px-2 text-xs text-[#F0F0F0] outline-none focus-visible:border-sky focus-visible:ring-2 focus-visible:ring-sky/40 disabled:opacity-60"
      >
        <option value="">Auto ({TIER_LABEL[autoTier]})</option>
        <option value="gold">Pin: Gold</option>
        <option value="silver">Pin: Silver</option>
        <option value="standard">Pin: Standard</option>
      </select>
      {error ? <p role="alert" className="mt-1 text-[11px] text-[#F1948A]">{error}</p> : null}
    </div>
  )
}
