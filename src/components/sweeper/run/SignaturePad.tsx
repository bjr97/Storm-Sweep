'use client'

import { Eraser } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { uploadJobMedia, useRunAction } from '@/components/sweeper/run/useRunAction'

/** Customer signs with a finger; saved as a PNG + typed name. */
export function SignaturePad({ jobId, disabled }: { jobId: string; disabled?: boolean }): React.ReactElement {
  const canvas = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const [hasInk, setHasInk] = useState(false)
  const [name, setName] = useState('')
  const [uploading, setUploading] = useState(false)
  const { run, busy, error, setError } = useRunAction(jobId)

  // Size the drawing buffer to the element (crisp on high-DPI phones).
  useEffect(() => {
    const el = canvas.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    el.width = Math.round(rect.width * dpr)
    el.height = Math.round(rect.height * dpr)
    const ctx = el.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#141416'
  }, [])

  function point(e: React.PointerEvent<HTMLCanvasElement>): { x: number; y: number } {
    const rect = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>): void {
    if (disabled) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drawing.current = true
    const ctx = e.currentTarget.getContext('2d')
    const p = point(e)
    ctx?.beginPath()
    ctx?.moveTo(p.x, p.y)
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>): void {
    if (!drawing.current) return
    const ctx = e.currentTarget.getContext('2d')
    const p = point(e)
    ctx?.lineTo(p.x, p.y)
    ctx?.stroke()
    setHasInk(true)
  }

  function clear(): void {
    const el = canvas.current
    el?.getContext('2d')?.clearRect(0, 0, el.width, el.height)
    setHasInk(false)
  }

  async function save(): Promise<void> {
    const el = canvas.current
    if (!el) return
    const blob = await new Promise<Blob | null>((resolve) => el.toBlob(resolve, 'image/png'))
    if (!blob) return setError('Could not read the signature — try again')
    setUploading(true)
    const up = await uploadJobMedia(jobId, 'signature', blob)
    setUploading(false)
    if (!up.ok) return setError(up.error)
    await run({ action: 'sign', name: name.trim(), path: up.data.path })
  }

  return (
    <div className="space-y-3 rounded-xl bg-[#F7F7F4] p-4 text-shelter">
      <p className="text-sm">
        I confirm the work above was completed and I received my walkthrough.
      </p>
      <div className="relative">
        <canvas
          ref={canvas}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={() => (drawing.current = false)}
          onPointerCancel={() => (drawing.current = false)}
          aria-label="Signature area — sign with your finger"
          className="h-44 w-full touch-none rounded-lg border-2 border-dashed border-black/20 bg-white"
        />
        {!hasInk ? (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-[#9A9A9F]">Sign here</span>
        ) : null}
      </div>
      <div className="flex items-end gap-2">
        <label className="flex-1 text-sm">
          <span className="font-semibold">Printed name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="off"
            className="mt-1 h-11 w-full rounded-lg border border-black/20 bg-white px-3 outline-none focus-visible:border-sky focus-visible:ring-2 focus-visible:ring-sky/40"
          />
        </label>
        <button type="button" onClick={clear} className="inline-flex h-11 items-center gap-1 rounded-lg px-3 text-sm font-semibold text-[#6B6B70] hover:bg-black/5">
          <Eraser className="size-4" aria-hidden="true" /> Clear
        </button>
      </div>
      <button
        type="button"
        onClick={() => void save()}
        disabled={disabled || !hasInk || name.trim().length < 2 || busy || uploading}
        className="h-12 w-full rounded-lg bg-sky font-bold text-white hover:bg-sky-dark disabled:opacity-50"
      >
        {uploading || busy ? 'Saving…' : 'Save signature'}
      </button>
      {error ? <p role="alert" className="text-sm font-semibold text-tornado">{error}</p> : null}
    </div>
  )
}
