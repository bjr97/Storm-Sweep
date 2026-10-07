'use client'

import { Check, Copy, Gift, Share2 } from 'lucide-react'
import { useState } from 'react'

import { formatCurrency } from '@/lib/utils'

/** "Give $25, get $25" — share link with copy + native share sheet. */
export function ReferralCard({
  link,
  reward,
  credit,
  invited,
  rewarded,
}: {
  link: string
  reward: number
  credit: number
  invited: number
  rewarded: number
}): React.ReactElement {
  const [copied, setCopied] = useState(false)
  const message = `I use Storm Sweep to keep our storm shelter clean and ready. Here's ${formatCurrency(reward)} off your first visit:`

  async function share(): Promise<void> {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: 'Storm Sweep', text: message, url: link })
        return
      } catch {
        // cancelled — fall through to copy
      }
    }
    await copy()
  }

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <section aria-labelledby="refer" className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
      <h2 id="refer" className="flex items-center gap-2 font-[family-name:var(--font-bebas)] text-2xl tracking-wide text-shelter">
        <Gift className="size-5 text-sky" aria-hidden="true" /> Give {formatCurrency(reward)}, get {formatCurrency(reward)}
      </h2>
      <p className="mt-1 text-sm text-[#4A4A50]">
        Friends get {formatCurrency(reward)} off their first visit. When their visit is done, you get {formatCurrency(reward)} toward your next one.
      </p>
      <div className="mt-3 flex items-center gap-2 rounded-lg border border-black/10 bg-[#F7F7F4] px-3 py-2">
        <code className="min-w-0 flex-1 truncate text-sm text-shelter">{link}</code>
        <button
          type="button"
          onClick={() => void copy()}
          className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-sky-dark hover:bg-black/5"
          aria-label="Copy your invite link"
        >
          {copied ? <Check className="size-3.5" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <button
        type="button"
        onClick={() => void share()}
        className="mt-3 inline-flex h-10 items-center gap-1.5 rounded-lg bg-sky px-4 text-sm font-semibold text-white hover:bg-sky-dark"
      >
        <Share2 className="size-4" aria-hidden="true" /> Share with a friend
      </button>
      <dl className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
        <div className="rounded-lg bg-[#F7F7F4] p-2"><dt className="text-[11px] text-[#6B6B70]">Friends invited</dt><dd className="font-bold">{invited}</dd></div>
        <div className="rounded-lg bg-[#F7F7F4] p-2"><dt className="text-[11px] text-[#6B6B70]">Rewards earned</dt><dd className="font-bold">{rewarded}</dd></div>
        <div className="rounded-lg bg-[#F7F7F4] p-2"><dt className="text-[11px] text-[#6B6B70]">Your credit</dt><dd className="font-bold text-[#1E7D46]">{formatCurrency(credit)}</dd></div>
      </dl>
    </section>
  )
}
