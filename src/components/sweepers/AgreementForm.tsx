'use client'

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
import { getApplicantId } from '@/lib/sweepers/session'
import { cn } from '@/lib/utils'

export function AgreementForm(): React.ReactElement {
  const router = useRouter()
  const [applicantId, setApplicantIdState] = useState<string | null>(null)
  const [embedSrc, setEmbedSrc] = useState<string | null>(null)
  const [signed, setSigned] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const checkSigned = useCallback(async (id: string): Promise<boolean> => {
    const response = await fetch(`/api/sweepers/apply?applicantId=${id}`)
    const result = (await response.json()) as {
      data?: { agreement_signed?: boolean }
    }
    return Boolean(result.data?.agreement_signed)
  }, [])

  const loadEmbed = useCallback(async (id: string): Promise<void> => {
    setLoading(true)
    setError(null)

    const alreadySigned = await checkSigned(id)
    if (alreadySigned) {
      setSigned(true)
      setLoading(false)
      return
    }

    const response = await fetch(`/api/docuseal/embed?applicantId=${id}`)
    const result = (await response.json()) as {
      error?: string
      data?: { signed?: boolean; embedSrc?: string | null }
    }

    if (!response.ok) {
      setError(result.error ?? 'Failed to load agreement')
      setLoading(false)
      return
    }

    if (result.data?.signed) {
      setSigned(true)
      setLoading(false)
      return
    }

    setEmbedSrc(result.data?.embedSrc ?? null)
    setLoading(false)
  }, [checkSigned])

  useEffect(() => {
    const id = getApplicantId()
    if (!id) {
      router.replace('/sweepers/apply')
      return
    }
    setApplicantIdState(id)
    void loadEmbed(id)
  }, [router, loadEmbed])

  useEffect(() => {
    if (!applicantId || signed) return

    function handleMessage(event: MessageEvent): void {
      if (
        event.data &&
        typeof event.data === 'object' &&
        'type' in event.data &&
        (event.data.type === 'docuseal.completed' ||
          event.data.type === 'form.completed')
      ) {
        setSigned(true)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [applicantId, signed])

  useEffect(() => {
    if (!applicantId || signed) return

    const interval = window.setInterval(() => {
      void checkSigned(applicantId).then((isSigned) => {
        if (isSigned) setSigned(true)
      })
    }, 5000)

    return () => window.clearInterval(interval)
  }, [applicantId, signed, checkSigned])

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      <ApplyStepper currentStep={3} />

      <Card>
        <CardHeader>
          <CardTitle className="font-[family-name:var(--font-bebas)] text-3xl tracking-wide">
            Independent Contractor Agreement
          </CardTitle>
          <CardDescription>
            Review and sign the Storm Sweep IC agreement covering scope of work,
            1099 status, pay structure, and equipment responsibility.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading agreement…</p>
          ) : null}

          {error ? (
            <p className="rounded-md bg-tornado/10 px-3 py-2 text-sm text-tornado">
              {error}
            </p>
          ) : null}

          {!loading && !error && !signed && embedSrc ? (
            <iframe
              src={embedSrc}
              title="Storm Sweep IC Agreement"
              className="h-[70vh] w-full rounded-lg border border-border bg-white"
            />
          ) : null}

          {signed ? (
            <div className="rounded-lg border border-sky-DEFAULT/30 bg-sky-DEFAULT/5 px-4 py-3 text-sm text-sky-dark">
              Agreement signed. You can continue to confirmation.
            </div>
          ) : null}

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <Link
              href="/sweepers/apply/tools"
              className={cn(
                buttonVariants({ variant: 'outline' }),
                'inline-flex h-11 flex-1 items-center justify-center'
              )}
            >
              Back
            </Link>
            <Button
              disabled={!signed}
              className="h-11 flex-1 bg-sky-DEFAULT font-semibold uppercase tracking-wide hover:bg-sky-dark"
              onClick={() => router.push('/sweepers/apply/confirmation')}
            >
              Continue to Confirmation
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
