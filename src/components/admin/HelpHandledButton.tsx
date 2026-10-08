'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function HelpHandledButton({ id }: { id: string }): React.ReactElement {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true)
        await fetch(`/api/admin/help/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ handled: true }) })
        router.refresh()
      }}
      className="rounded-md border border-white/10 px-2 py-1 text-[11px] font-semibold text-[#C9C9CE] hover:bg-white/[0.06] disabled:opacity-50"
    >
      {busy ? 'Saving…' : 'Mark handled'}
    </button>
  )
}
