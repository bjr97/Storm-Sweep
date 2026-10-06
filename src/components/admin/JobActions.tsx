'use client'

import { useJobUpdate } from '@/components/admin/useJobUpdate'
import type { JobStatus } from '@/types/database'

type JobActionsProps = {
  jobId: string
  status: JobStatus
  photoGrade: string | null
  photoApproved: boolean
}

const btn =
  'inline-flex h-9 items-center justify-center rounded-md px-3.5 text-[13px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50'

export function JobActions({ jobId, status, photoGrade, photoApproved }: JobActionsProps): React.ReactElement {
  const { update, saving, error } = useJobUpdate(jobId)
  const locked = status === 'in_progress' || status === 'complete'
  const needsPhotoReview = !photoApproved

  if (locked) {
    return (
      <p className="text-[13px] text-[#8A8A8F]">
        This job is {status === 'complete' ? 'complete' : 'in progress'} — status is controlled by the Sweeper.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {needsPhotoReview ? (
        <div className="rounded-lg border border-[#E67E22]/30 bg-[#E67E22]/10 p-3">
          <p className="text-[13px] text-[#F0B27A]">
            Shelter photo graded <strong>{photoGrade ?? '—'}</strong> — review it below before confirming.
            {photoGrade === 'D' || photoGrade === 'F' ? ' Policy: call the customer first.' : ''}
          </p>
          <button
            type="button"
            disabled={saving}
            onClick={() => void update({ approvePhoto: true })}
            className={`${btn} mt-2 bg-[#E67E22] text-[#141416] hover:bg-[#F0B27A]`}
          >
            Approve photo
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {status !== 'confirmed' ? (
          <button
            type="button"
            disabled={saving || needsPhotoReview}
            title={needsPhotoReview ? 'Approve the shelter photo first' : undefined}
            onClick={() => void update({ status: 'confirmed' })}
            className={`${btn} bg-sky text-white hover:bg-sky-light`}
          >
            Confirm booking
          </button>
        ) : (
          <button
            type="button"
            disabled={saving}
            onClick={() => void update({ status: 'pending' })}
            className={`${btn} border border-white/10 bg-white/[0.04] text-[#F0F0F0] hover:bg-white/[0.08]`}
          >
            Move back to pending
          </button>
        )}
        {status !== 'cancelled' ? (
          <button
            type="button"
            disabled={saving}
            onClick={() => {
              if (window.confirm('Cancel this job? Refunds are handled separately in Stripe/PayPal.')) {
                void update({ status: 'cancelled' })
              }
            }}
            className={`${btn} border border-tornado/50 text-[#F1948A] hover:bg-tornado/15`}
          >
            Cancel job
          </button>
        ) : (
          <button
            type="button"
            disabled={saving}
            onClick={() => void update({ status: 'pending' })}
            className={`${btn} border border-white/10 bg-white/[0.04] text-[#F0F0F0] hover:bg-white/[0.08]`}
          >
            Reopen job
          </button>
        )}
      </div>
      {error ? <p className="text-[13px] text-[#F1948A]">{error}</p> : null}
    </div>
  )
}
