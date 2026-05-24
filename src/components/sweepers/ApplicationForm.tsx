'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import { ApplyStepper } from '@/components/sweepers/ApplyStepper'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { HEARD_ABOUT_OPTIONS } from '@/lib/sweepers/constants'
import {
  sweeperApplySchema,
  type SweeperApplyInput,
} from '@/lib/sweepers/schemas'
import { setApplicantId } from '@/lib/sweepers/session'

export function ApplicationForm(): React.ReactElement {
  const router = useRouter()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SweeperApplyInput>({
    resolver: zodResolver(sweeperApplySchema),
    defaultValues: {
      full_name: '',
      email: '',
      phone: '',
      availability: 'both',
      has_vehicle: false,
      experience_notes: '',
      heard_about: '',
    },
  })

  async function onSubmit(values: SweeperApplyInput): Promise<void> {
    setSubmitError(null)

    const response = await fetch('/api/sweepers/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })

    const result = (await response.json()) as {
      error?: string
      data?: { id: string }
    }

    if (!response.ok || !result.data?.id) {
      setSubmitError(result.error ?? 'Failed to submit application')
      return
    }

    setApplicantId(result.data.id)
    router.push('/sweepers/apply/tools')
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
      <ApplyStepper currentStep={1} />

      <Card>
        <CardHeader>
          <CardTitle className="font-[family-name:var(--font-bebas)] text-3xl tracking-wide">
            Become a Sweeper
          </CardTitle>
          <CardDescription>
            Join Storm Sweep as an independent contractor. Norman, OK area only
            for launch.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full name</Label>
              <Input id="full_name" autoComplete="name" {...register('full_name')} />
              {errors.full_name ? (
                <p className="text-sm text-tornado">{errors.full_name.message}</p>
              ) : null}
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="email" {...register('email')} />
                {errors.email ? (
                  <p className="text-sm text-tornado">{errors.email.message}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" type="tel" autoComplete="tel" {...register('phone')} />
                {errors.phone ? (
                  <p className="text-sm text-tornado">{errors.phone.message}</p>
                ) : null}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="availability">Availability</Label>
              <select
                id="availability"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                {...register('availability')}
              >
                <option value="weekdays">Weekdays</option>
                <option value="weekends">Weekends</option>
                <option value="both">Both weekdays &amp; weekends</option>
              </select>
            </div>

            <div className="flex items-start gap-3">
              <input
                id="has_vehicle"
                type="checkbox"
                className="mt-1 size-4 rounded border-input"
                {...register('has_vehicle')}
              />
              <div>
                <Label htmlFor="has_vehicle">I have a reliable vehicle</Label>
                <p className="text-sm text-muted-foreground">
                  Required to transport equipment to job sites across Norman.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="experience_notes">Experience notes (optional)</Label>
              <textarea
                id="experience_notes"
                rows={4}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Cleaning, handyman, or field service experience..."
                {...register('experience_notes')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="heard_about">How did you hear about us?</Label>
              <select
                id="heard_about"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                {...register('heard_about')}
              >
                <option value="">Select one...</option>
                {HEARD_ABOUT_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {errors.heard_about ? (
                <p className="text-sm text-tornado">{errors.heard_about.message}</p>
              ) : null}
            </div>

            {submitError ? (
              <p className="rounded-md bg-tornado/10 px-3 py-2 text-sm text-tornado">
                {submitError}
              </p>
            ) : null}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-11 w-full bg-sky-DEFAULT font-semibold uppercase tracking-wide hover:bg-sky-dark"
            >
              {isSubmitting ? 'Submitting…' : 'Continue to Tool Photos'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
