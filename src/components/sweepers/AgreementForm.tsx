'use client'

import { FileCheck2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { ApplyStepper } from '@/components/sweepers/ApplyStepper'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AGREEMENT_SECTIONS, AGREEMENT_TITLE, AGREEMENT_VERSION } from '@/lib/sweepers/agreement'
import { getApplicantId } from '@/lib/sweepers/session'
import { cn } from '@/lib/utils'

export function AgreementForm(): React.ReactElement {
  const router = useRouter()
  const [applicantId, setApplicantIdState] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [signed, setSigned] = useState(false)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [agreed, setAgreed] = useState(false)
  const [legalName, setLegalName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const id = getApplicantId()
    if (!id) {
      router.replace('/sweepers/apply')
      return
    }
    setApplicantIdState(id)
    void fetch(`/api/sweepers/apply?applicantId=${id}`)
      .then((r) => r.json() as Promise<{ data?: { agreement_signed?: boolean } }>)
      .then((result) => setSigned(Boolean(result.data?.agreement_signed)))
      .catch(() => setError('Could not load your application. Please refresh.'))
      .finally(() => setLoading(false))
  }, [router])

  async function handleSign(event: React.FormEvent): Promise<void> {
    event.preventDefault()
    if (!applicantId) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/sweepers/agreement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicantId, legalName, agreed }),
      })
      const result = (await res.json()) as { error?: string; code?: string; data?: { downloadUrl?: string | null } }
      if (!res.ok && result.code !== 'ALREADY_SIGNED') {
        setError(result.error ?? 'Could not sign the agreement. Please try again.')
        return
      }
      setDownloadUrl(result.data?.downloadUrl ?? null)
      setSigned(true)
    } catch {
      setError('Could not reach the server. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      <ApplyStepper currentStep={3} />

      <Card>
        <CardHeader>
          <CardTitle className="font-[family-name:var(--font-bebas)] text-3xl tracking-wide">
            Independent Contractor Agreement
          </CardTitle>
          <CardDescription>
            Please read the whole agreement. It covers your independent contractor status, pay, taxes,
            equipment, safety, and conduct.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}

          {!loading && !signed ? (
            <>
              <article
                tabIndex={0}
                aria-label={AGREEMENT_TITLE}
                className="max-h-[55vh] space-y-4 overflow-y-auto rounded-lg border border-border bg-[#F7F7F4] p-5 text-sm leading-relaxed text-shelter focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky"
              >
                <header>
                  <h2 className="text-base font-semibold">{AGREEMENT_TITLE}</h2>
                  <p className="text-xs text-muted-foreground">Version {AGREEMENT_VERSION}</p>
                </header>
                {AGREEMENT_SECTIONS.map((section) => (
                  <section key={section.heading} className="space-y-2">
                    <h3 className="font-semibold">{section.heading}</h3>
                    {section.paragraphs.map((p) => (
                      <p key={p.slice(0, 40)}>{p}</p>
                    ))}
                  </section>
                ))}
              </article>

              <form onSubmit={(e) => void handleSign(e)} className="space-y-4">
                <label className="flex cursor-pointer items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-0.5 size-4 accent-sky"
                  />
                  <span>
                    I have read and agree to the Storm Sweep Independent Contractor Agreement, and I agree that typing
                    my name below is my electronic signature.
                  </span>
                </label>

                <div className="space-y-2">
                  <Label htmlFor="legal-name">Full legal name (your signature)</Label>
                  <Input
                    id="legal-name"
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    autoComplete="name"
                    placeholder="Type your full legal name"
                    className="h-11 bg-white font-medium"
                  />
                  <p className="text-xs text-muted-foreground">Must match the name on your application.</p>
                </div>

                {error ? (
                  <p role="alert" className="rounded-md bg-tornado/10 px-3 py-2 text-sm text-tornado">
                    {error}
                  </p>
                ) : null}

                <Button
                  type="submit"
                  disabled={!agreed || legalName.trim().length < 2 || submitting}
                  className="h-11 w-full bg-sky font-semibold uppercase tracking-wide text-white hover:bg-sky-dark"
                >
                  {submitting ? 'Signing…' : 'Sign agreement'}
                </Button>
              </form>
            </>
          ) : null}

          {signed ? (
            <div className="flex items-start gap-3 rounded-lg border border-sky/30 bg-sky/5 px-4 py-3 text-sm text-sky-dark">
              <FileCheck2 className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-semibold">Agreement signed.</p>
                <p>
                  You can continue to confirmation.
                  {downloadUrl ? (
                    <>
                      {' '}
                      <a href={downloadUrl} target="_blank" rel="noreferrer" className="font-semibold underline">
                        Download your signed copy (PDF)
                      </a>
                      {' '}— the link expires in 10 minutes.
                    </>
                  ) : null}
                </p>
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <Link
              href="/sweepers/apply/tools"
              className={cn(buttonVariants({ variant: 'outline' }), 'inline-flex h-11 flex-1 items-center justify-center')}
            >
              Back
            </Link>
            <Button
              disabled={!signed}
              className="h-11 flex-1 bg-sky font-semibold uppercase tracking-wide text-white hover:bg-sky-dark"
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
