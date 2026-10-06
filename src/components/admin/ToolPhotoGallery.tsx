'use client'

import { Check, ChevronLeft, ChevronRight, X } from 'lucide-react'
import Image from 'next/image'
import { useCallback, useEffect, useState } from 'react'

import type { ToolPhotoView } from '@/lib/admin/applicants'
import { cn } from '@/lib/utils'

export function ToolPhotoGallery({ tools }: { tools: ToolPhotoView[] }): React.ReactElement {
  const viewable = tools.filter((t) => t.url)
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const close = useCallback(() => setOpenIndex(null), [])
  const step = useCallback(
    (dir: 1 | -1) => setOpenIndex((i) => (i === null ? null : (i + dir + viewable.length) % viewable.length)),
    [viewable.length]
  )

  useEffect(() => {
    if (openIndex === null) return
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowRight') step(1)
      if (e.key === 'ArrowLeft') step(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openIndex, close, step])

  const open = openIndex !== null ? viewable[openIndex] : null

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {tools.map((tool) => (
          <li key={tool.key} className="overflow-hidden rounded-lg border border-white/[0.07] bg-[#141416]">
            {tool.url ? (
              <button
                type="button"
                onClick={() => setOpenIndex(viewable.findIndex((v) => v.key === tool.key))}
                className="block w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky"
                aria-label={`View ${tool.label} photo`}
              >
                <Image src={tool.url} alt={tool.label} width={320} height={240} unoptimized className="aspect-[4/3] w-full object-cover" />
              </button>
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center text-[11px] text-[#8A8A8F]">
                {tool.uploaded ? 'Unavailable' : 'Not uploaded'}
              </div>
            )}
            <div className="flex items-start gap-1.5 px-2 py-1.5">
              <span
                className={cn(
                  'mt-0.5 flex size-3.5 shrink-0 items-center justify-center rounded-full',
                  tool.uploaded ? 'bg-[#27AE60]' : 'border border-[#F0B27A]'
                )}
              >
                {tool.uploaded ? <Check className="size-2.5 text-white" aria-hidden="true" /> : null}
              </span>
              <span className="text-[11px] leading-tight text-[#C8C8CC]">
                {tool.label}
                <span className="sr-only">{tool.uploaded ? ' (uploaded)' : ' (missing)'}</span>
              </span>
            </div>
          </li>
        ))}
      </ul>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={open.label}
          className="fixed inset-0 z-50 flex flex-col bg-black/90 p-4"
          onClick={close}
        >
          <div className="flex items-center justify-between text-sm text-white">
            <p>
              <span className="font-semibold">{open.label}</span>
              <span className="ml-2 text-[#9A9A9F]">{open.hint}</span>
            </p>
            <button type="button" onClick={close} aria-label="Close" className="rounded-md p-2 hover:bg-white/10">
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center" onClick={(e) => e.stopPropagation()}>
            {viewable.length > 1 ? (
              <button type="button" onClick={() => step(-1)} aria-label="Previous photo" className="absolute left-0 rounded-full bg-white/10 p-2 text-white hover:bg-white/20">
                <ChevronLeft className="size-6" aria-hidden="true" />
              </button>
            ) : null}
            <Image src={open.url ?? ''} alt={open.label} width={1600} height={1200} unoptimized className="max-h-full w-auto max-w-full object-contain" />
            {viewable.length > 1 ? (
              <button type="button" onClick={() => step(1)} aria-label="Next photo" className="absolute right-0 rounded-full bg-white/10 p-2 text-white hover:bg-white/20">
                <ChevronRight className="size-6" aria-hidden="true" />
              </button>
            ) : null}
          </div>
          <p className="text-center text-xs text-[#9A9A9F]">
            {(openIndex ?? 0) + 1} / {viewable.length} · Esc to close · ← → to browse
          </p>
        </div>
      ) : null}
    </>
  )
}
