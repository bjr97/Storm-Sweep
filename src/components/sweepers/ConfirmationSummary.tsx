'use client'

import { CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { ApplyStepper } from '@/components/sweepers/ApplyStepper'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { TOOL_PHOTO_REQUIREMENTS } from '@/lib/sweepers/constants'
import { clearApplicantId, getApplicantId } from '@/lib/sweepers/session'

type ApplicantSummary = {
  full_name: string
  email: string
  phone: string
  availability: string
  has_vehicle: boolean
  heard_about: string | null
  all_tools_verified: boolean
  agreement_signed: boolean
  applied_at: string
}

export function ConfirmationSummary(): React.ReactElement {
  const router = useRouter()
  const [summary, setSummary] = useState<ApplicantSummary | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    const id = getApplicantId()
    if (!id) {
      router.replace('/sweepers/apply')
      return
    }

    async function load(applicantId: string): Promise<void> {
      const response = await fetch(`/api/sweepers/apply?applicantId=${applicantId}`)
      const result = (await response.json()) as {
        error?: string
        data?: ApplicantSummary
      }

      if (!response.ok || !result.data) {
        setLoadError(result.error ?? 'Failed to load application summary')
        return
      }

      setSummary(result.data)
    }

    void load(id)
  }, [router])

  const availabilityLabel =
    summary?.availability === 'weekdays'
      ? 'Weekdays'
      : summary?.availability === 'weekends'
        ? 'Weekends'
        : 'Weekdays & weekends'

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
      <ApplyStepper currentStep={4} />

      <Card>
        <CardHeader className="text-center">
          <CheckCircle2 className="mx-auto size-12 text-sky-DEFAULT" />
          <CardTitle className="font-[family-name:var(--font-bebas)] text-4xl tracking-wide">
            Application Received!
          </CardTitle>
          <CardDescription className="text-base">
            We review within 24 hours. You&apos;ll receive a text when approved.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {loadError ? (
            <p className="rounded-md bg-tornado/10 px-3 py-2 text-sm text-tornado">
              {loadError}
            </p>
          ) : null}

          {summary ? (
            <div className="space-y-4 rounded-lg border border-border bg-black/[0.02] p-4">
              <h3 className="font-[family-name:var(--font-barlow-condensed)] text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Your submission
              </h3>
              <dl className="grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">Name</dt>
                  <dd className="text-sm font-medium">{summary.full_name}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">Email</dt>
                  <dd className="text-sm font-medium">{summary.email}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">Phone</dt>
                  <dd className="text-sm font-medium">{summary.phone}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">Availability</dt>
                  <dd className="text-sm font-medium">{availabilityLabel}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">Vehicle</dt>
                  <dd className="text-sm font-medium">
                    {summary.has_vehicle ? 'Yes' : 'No'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">Heard about us</dt>
                  <dd className="text-sm font-medium">{summary.heard_about ?? '—'}</dd>
                </div>
              </dl>

              <ul className="space-y-2 border-t border-border pt-4 text-sm">
                <li className="flex items-center justify-between">
                  <span>Tool photos ({TOOL_PHOTO_REQUIREMENTS.length} required)</span>
                  <span className={summary.all_tools_verified ? 'text-sky-DEFAULT' : 'text-tornado'}>
                    {summary.all_tools_verified ? 'Complete' : 'Incomplete'}
                  </span>
                </li>
                <li className="flex items-center justify-between">
                  <span>IC agreement signed</span>
                  <span className={summary.agreement_signed ? 'text-sky-DEFAULT' : 'text-tornado'}>
                    {summary.agreement_signed ? 'Yes' : 'No'}
                  </span>
                </li>
              </ul>
            </div>
          ) : null}

          <Button
            className="h-11 w-full bg-sky-DEFAULT font-semibold uppercase tracking-wide hover:bg-sky-dark"
            onClick={() => {
              clearApplicantId()
              router.push('/')
            }}
          >
            Return to Homepage
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Questions? Email{' '}
            <Link href="mailto:hello@stormsweep.com" className="text-sky-DEFAULT hover:underline">
              hello@stormsweep.com
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
