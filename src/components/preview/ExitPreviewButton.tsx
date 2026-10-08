'use client'

import { useState } from 'react'

import { exitPreview } from '@/lib/previewClient'
import { cn } from '@/lib/utils'

export function ExitPreviewButton({ className }: { className?: string }): React.ReactElement {
  const [busy, setBusy] = useState(false)
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => {
        setBusy(true)
        void exitPreview()
      }}
      className={cn('h-7 rounded-md px-3 text-xs font-bold disabled:opacity-60', className)}
    >
      {busy ? 'Switching…' : 'Back to admin'}
    </button>
  )
}
