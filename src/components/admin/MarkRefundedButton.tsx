'use client'

import { useJobUpdate } from '@/components/admin/useJobUpdate'

export function MarkRefundedButton({ jobId }: { jobId: string }): React.ReactElement {
  const { update, saving, error } = useJobUpdate(jobId)
  return (
    <div>
      <button
        type="button"
        disabled={saving}
        onClick={() => void update({ markRefunded: true })}
        className="h-8 rounded-md bg-wheat px-3 text-xs font-bold text-shelter hover:bg-wheat-light disabled:opacity-60"
      >
        {saving ? 'Saving…' : 'Mark refunded'}
      </button>
      {error ? <p role="alert" className="mt-1 text-[11px] text-[#F1948A]">{error}</p> : null}
    </div>
  )
}
