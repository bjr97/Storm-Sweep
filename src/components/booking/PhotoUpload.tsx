'use client'

import { AlertCircle, CheckCircle2, Clock, ImagePlus, Loader2, Upload } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

export type PhotoScreenResult = {
  grade: string
  approved: boolean
  customer_message: string
  flags?: string[]
  storage_path?: string
}

type PhotoUploadProps = {
  bookingId: string
  onResult: (result: PhotoScreenResult | null) => void
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error'

function getGradeMessage(grade: string, customerMessage?: string): {
  tone: 'success' | 'warning' | 'danger'
  message: string
} {
  if (customerMessage) {
    const upper = grade.toUpperCase()
    if (upper === 'A' || upper === 'B') {
      return { tone: 'success', message: customerMessage }
    }
    if (upper === 'C') {
      return { tone: 'warning', message: customerMessage }
    }
    return { tone: 'danger', message: customerMessage }
  }

  const upper = grade.toUpperCase()
  if (upper === 'A' || upper === 'B') {
    return {
      tone: 'success',
      message: 'Looks great! Your booking is confirmed.',
    }
  }
  if (upper === 'C') {
    return {
      tone: 'warning',
      message: "We'll review this and confirm within 2 hours.",
    }
  }
  return {
    tone: 'danger',
    message: 'Our team will contact you shortly to discuss before confirming.',
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result !== 'string') {
        reject(new Error('Unable to read file'))
        return
      }
      const base64 = result.split(',')[1]
      if (!base64) {
        reject(new Error('Unable to encode file'))
        return
      }
      resolve(base64)
    }
    reader.onerror = () => reject(new Error('Unable to read file'))
    reader.readAsDataURL(file)
  })
}

export function PhotoUpload({
  bookingId,
  onResult,
}: PhotoUploadProps): React.ReactElement {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [dragActive, setDragActive] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [result, setResult] = useState<PhotoScreenResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const processFile = useCallback(
    async (file: File): Promise<void> => {
      if (!file.type.startsWith('image/')) {
        setErrorMessage('Please upload an image file (JPG, PNG, or WebP).')
        setUploadState('error')
        return
      }

      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage('Image must be under 10 MB.')
        setUploadState('error')
        return
      }

      setUploadState('uploading')
      setErrorMessage(null)
      setPreviewUrl(URL.createObjectURL(file))

      try {
        const supabase = createClient()
        const extension = file.name.split('.').pop() ?? 'jpg'
        const storagePath = `booking-screen/${bookingId}/${Date.now()}.${extension}`

        const { error: uploadError } = await supabase.storage
          .from('job-photos')
          .upload(storagePath, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type,
          })

        if (uploadError) {
          throw new Error(uploadError.message)
        }

        const base64 = await fileToBase64(file)

        const response = await fetch('/api/photo-screen', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: base64,
            mediaType: file.type,
            bookingId,
            storagePath,
          }),
        })

        const payload = (await response.json()) as {
          data?: PhotoScreenResult
          error?: string
        }

        if (!response.ok || !payload.data) {
          throw new Error(payload.error ?? 'Photo screening failed')
        }

        const screenResult: PhotoScreenResult = {
          ...payload.data,
          storage_path: storagePath,
        }

        setResult(screenResult)
        setUploadState('success')
        onResult(screenResult)
      } catch (error) {
        setUploadState('error')
        setErrorMessage(
          error instanceof Error ? error.message : 'Upload failed. Please try again.'
        )
        onResult(null)
      }
    },
    [bookingId, onResult]
  )

  function handleFiles(files: FileList | null): void {
    const file = files?.[0]
    if (file) {
      void processFile(file)
    }
  }

  const gradeDisplay = result ? getGradeMessage(result.grade, result.customer_message) : null

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-[family-name:var(--font-bebas)] text-2xl tracking-wide text-shelter">
          SHELTER PHOTO
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Optional but encouraged — upload a photo of your shelter so your Sweeper arrives prepared.
        </p>
      </div>

      <div
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            inputRef.current?.click()
          }
        }}
        onDragEnter={(event) => {
          event.preventDefault()
          setDragActive(true)
        }}
        onDragOver={(event) => {
          event.preventDefault()
          setDragActive(true)
        }}
        onDragLeave={(event) => {
          event.preventDefault()
          setDragActive(false)
        }}
        onDrop={(event) => {
          event.preventDefault()
          setDragActive(false)
          handleFiles(event.dataTransfer.files)
        }}
        onClick={() => uploadState !== 'uploading' && inputRef.current?.click()}
        className={cn(
          'relative flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed bg-white p-8 text-center transition-all',
          dragActive
            ? 'border-sky-DEFAULT bg-sky-pale/50'
            : 'border-border hover:border-sky-DEFAULT/60 hover:bg-sky-pale/20',
          uploadState === 'uploading' && 'pointer-events-none opacity-80'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(event) => handleFiles(event.target.files)}
        />

        {uploadState === 'uploading' ? (
          <>
            <Loader2 className="size-10 animate-spin text-sky-DEFAULT" />
            <p className="mt-4 font-medium text-shelter">Analyzing your shelter photo…</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Uploading to storage and running AI screening
            </p>
          </>
        ) : previewUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Shelter preview"
              className="max-h-40 rounded-lg object-cover shadow-sm"
            />
            <p className="mt-4 text-sm text-muted-foreground">Click or drop to replace photo</p>
          </>
        ) : (
          <>
            <div className="flex size-14 items-center justify-center rounded-full bg-sky-pale">
              <ImagePlus className="size-7 text-sky-DEFAULT" />
            </div>
            <p className="mt-4 font-medium text-shelter">Drag and drop your shelter photo</p>
            <p className="mt-1 text-sm text-muted-foreground">or click to browse (JPG, PNG, WebP)</p>
            <Button
              type="button"
              variant="outline"
              className="mt-4 gap-2"
              onClick={(event) => {
                event.stopPropagation()
                inputRef.current?.click()
              }}
            >
              <Upload className="size-4" />
              Choose file
            </Button>
          </>
        )}
      </div>

      {errorMessage ? (
        <div className="flex items-start gap-3 rounded-xl border border-tornado/30 bg-tornado/5 p-4">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-tornado" />
          <p className="text-sm text-tornado">{errorMessage}</p>
        </div>
      ) : null}

      {gradeDisplay && result ? (
        <div
          className={cn(
            'rounded-xl border p-4',
            gradeDisplay.tone === 'success' && 'border-green-200 bg-green-50',
            gradeDisplay.tone === 'warning' && 'border-wheat-DEFAULT/40 bg-wheat-pale/50',
            gradeDisplay.tone === 'danger' && 'border-tornado/30 bg-tornado/5'
          )}
        >
          <div className="flex items-start gap-3">
            {gradeDisplay.tone === 'success' ? (
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-green-600" />
            ) : gradeDisplay.tone === 'warning' ? (
              <Clock className="mt-0.5 size-5 shrink-0 text-wheat-DEFAULT" />
            ) : (
              <AlertCircle className="mt-0.5 size-5 shrink-0 text-tornado" />
            )}
            <div>
              <p className="font-medium text-shelter">Grade {result.grade.toUpperCase()}</p>
              <p className="mt-1 text-sm text-muted-foreground">{gradeDisplay.message}</p>
              {result.flags && result.flags.length > 0 ? (
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {result.flags.map((flag) => (
                    <li key={flag}>• {flag}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
