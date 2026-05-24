'use client'

import { Check, ImageIcon, Loader2, Upload } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

import { ApplyStepper } from '@/components/sweepers/ApplyStepper'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  TOOL_PHOTO_REQUIREMENTS,
  type ToolPhotoKey,
} from '@/lib/sweepers/constants'
import { getApplicantId } from '@/lib/sweepers/session'
import { cn } from '@/lib/utils'

type ToolPhotosState = Partial<Record<ToolPhotoKey, string>>

export function ToolPhotosForm(): React.ReactElement {
  const router = useRouter()
  const [applicantId, setApplicantIdState] = useState<string | null>(null)
  const [toolPhotos, setToolPhotos] = useState<ToolPhotosState>({})
  const [uploadingKey, setUploadingKey] = useState<ToolPhotoKey | null>(null)
  const [allVerified, setAllVerified] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const loadProgress = useCallback(async (id: string): Promise<void> => {
    const response = await fetch(`/api/sweepers/apply/tools?applicantId=${id}`)
    const result = (await response.json()) as {
      error?: string
      data?: {
        toolPhotos: ToolPhotosState
        allToolsVerified: boolean
      }
    }

    if (!response.ok || !result.data) {
      setLoadError(result.error ?? 'Failed to load upload progress')
      return
    }

    setToolPhotos(result.data.toolPhotos)
    setAllVerified(result.data.allToolsVerified)
  }, [])

  useEffect(() => {
    const id = getApplicantId()
    if (!id) {
      router.replace('/sweepers/apply')
      return
    }
    setApplicantIdState(id)
    void loadProgress(id)
  }, [router, loadProgress])

  async function handleUpload(key: ToolPhotoKey, file: File): Promise<void> {
    if (!applicantId) return

    setUploadingKey(key)
    setLoadError(null)

    const formData = new FormData()
    formData.append('applicantId', applicantId)
    formData.append('toolKey', key)
    formData.append('file', file)

    const response = await fetch('/api/sweepers/apply/tools', {
      method: 'POST',
      body: formData,
    })

    const result = (await response.json()) as {
      error?: string
      data?: {
        toolPhotos: ToolPhotosState
        allToolsVerified: boolean
      }
    }

    setUploadingKey(null)

    if (!response.ok || !result.data) {
      setLoadError(result.error ?? 'Upload failed')
      return
    }

    setToolPhotos(result.data.toolPhotos)
    setAllVerified(result.data.allToolsVerified)
  }

  const uploadedCount = TOOL_PHOTO_REQUIREMENTS.filter(
    (tool) => toolPhotos[tool.key]
  ).length

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <ApplyStepper currentStep={2} />

      <Card>
        <CardHeader>
          <CardTitle className="font-[family-name:var(--font-bebas)] text-3xl tracking-wide">
            Tool Photos
          </CardTitle>
          <CardDescription>
            Upload photos of all 7 required tools. Each photo is reviewed before
            approval.
          </CardDescription>
          <p className="font-[family-name:var(--font-barlow-condensed)] text-sm font-semibold text-sky-DEFAULT">
            {uploadedCount} of {TOOL_PHOTO_REQUIREMENTS.length} uploaded
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {TOOL_PHOTO_REQUIREMENTS.map((tool) => {
            const isUploaded = Boolean(toolPhotos[tool.key])
            const isUploading = uploadingKey === tool.key

            return (
              <div
                key={tool.key}
                className={cn(
                  'rounded-lg border p-4',
                  isUploaded ? 'border-sky-DEFAULT/40 bg-sky-DEFAULT/5' : 'border-border'
                )}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {isUploaded ? (
                        <Check className="size-5 text-sky-DEFAULT" aria-hidden="true" />
                      ) : (
                        <Upload className="size-5 text-muted-foreground" aria-hidden="true" />
                      )}
                      <p className="font-[family-name:var(--font-barlow-condensed)] text-sm font-semibold">
                        {tool.label}
                      </p>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{tool.hint}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex size-16 flex-col items-center justify-center rounded-md border border-dashed border-muted-foreground/40 bg-black/5 text-muted-foreground">
                      <ImageIcon className="size-5" aria-hidden="true" />
                      <span className="mt-1 text-[10px] font-semibold uppercase tracking-wide">
                        Example
                      </span>
                    </div>

                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/heic"
                        className="sr-only"
                        disabled={isUploading}
                        onChange={(event) => {
                          const file = event.target.files?.[0]
                          if (file) void handleUpload(tool.key, file)
                          event.target.value = ''
                        }}
                      />
                      <span
                        className={cn(
                          'inline-flex h-10 items-center rounded-md px-4 text-sm font-semibold uppercase tracking-wide',
                          isUploaded
                            ? 'bg-sky-DEFAULT/10 text-sky-dark hover:bg-sky-DEFAULT/20'
                            : 'bg-sky-DEFAULT text-white hover:bg-sky-dark',
                          isUploading && 'pointer-events-none opacity-60'
                        )}
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="mr-2 size-4 animate-spin" />
                            Uploading…
                          </>
                        ) : isUploaded ? (
                          'Replace'
                        ) : (
                          'Upload'
                        )}
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            )
          })}

          {loadError ? (
            <p className="rounded-md bg-tornado/10 px-3 py-2 text-sm text-tornado">
              {loadError}
            </p>
          ) : null}

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <Link
              href="/sweepers/apply"
              className={cn(
                buttonVariants({ variant: 'outline' }),
                'inline-flex h-11 flex-1 items-center justify-center'
              )}
            >
              Back
            </Link>
            <Button
              disabled={!allVerified}
              className="h-11 flex-1 bg-sky-DEFAULT font-semibold uppercase tracking-wide hover:bg-sky-dark"
              onClick={() => router.push('/sweepers/apply/agreement')}
            >
              Continue to Agreement
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
