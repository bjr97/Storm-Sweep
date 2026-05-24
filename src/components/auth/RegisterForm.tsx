'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

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
import { createClient } from '@/lib/supabase/client'

const registerSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z
    .string()
    .min(10, 'Enter a valid phone number')
    .regex(/^[\d\s()+-]+$/, 'Enter a valid phone number'),
})

type RegisterFormValues = z.infer<typeof registerSchema>

export function RegisterForm(): React.ReactElement {
  const router = useRouter()
  const [authError, setAuthError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      phone: '',
    },
  })

  async function onSubmit(values: RegisterFormValues): Promise<void> {
    setAuthError(null)
    setSuccessMessage(null)
    const supabase = createClient()

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
          full_name: values.fullName,
          phone: values.phone,
        },
      },
    })

    if (signUpError) {
      setAuthError(signUpError.message)
      return
    }

    if (data.user && !data.session) {
      setSuccessMessage(
        'Account created. Check your email to confirm your address, then sign in.'
      )
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="flex w-full max-w-md flex-col items-center px-4 py-12">
      <div className="mb-8 text-center">
        <Link href="/">
          <h1 className="font-[family-name:var(--font-bebas)] text-4xl tracking-wide text-shelter">
            STORM SWEEP
          </h1>
        </Link>
        <p className="mt-1 text-sm text-muted-foreground">
          Norman, OK · Underground shelter cleaning
        </p>
      </div>

      <Card className="w-full shadow-sm">
        <CardHeader>
          <CardTitle className="font-[family-name:var(--font-bebas)] text-2xl tracking-wide">
            CREATE ACCOUNT
          </CardTitle>
          <CardDescription>
            Sign up to book shelter cleaning and manage your service history.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                type="text"
                autoComplete="name"
                aria-invalid={Boolean(errors.fullName)}
                {...register('fullName')}
              />
              {errors.fullName ? (
                <p className="text-sm text-tornado">{errors.fullName.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                aria-invalid={Boolean(errors.email)}
                {...register('email')}
              />
              {errors.email ? (
                <p className="text-sm text-tornado">{errors.email.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                autoComplete="tel"
                placeholder="(405) 555-0100"
                aria-invalid={Boolean(errors.phone)}
                {...register('phone')}
              />
              {errors.phone ? (
                <p className="text-sm text-tornado">{errors.phone.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                aria-invalid={Boolean(errors.password)}
                {...register('password')}
              />
              {errors.password ? (
                <p className="text-sm text-tornado">
                  {errors.password.message}
                </p>
              ) : null}
            </div>

            {authError ? (
              <p className="rounded-lg bg-tornado/10 px-3 py-2 text-sm text-tornado">
                {authError}
              </p>
            ) : null}

            {successMessage ? (
              <p className="rounded-lg bg-sky-pale px-3 py-2 text-sm text-sky-dark">
                {successMessage}
              </p>
            ) : null}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-10 w-full bg-sky-DEFAULT text-base text-white hover:bg-sky-dark"
            >
              {isSubmitting ? 'Creating account…' : 'Create account'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-medium text-sky-DEFAULT hover:underline"
            >
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
