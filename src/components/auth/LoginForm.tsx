'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
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
import { getPostAuthRedirect } from '@/lib/auth/redirects'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/types/database'

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginFormValues = z.infer<typeof loginSchema>

export function LoginForm(): React.ReactElement {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [authError, setAuthError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  async function onSubmit(values: LoginFormValues): Promise<void> {
    setAuthError(null)
    const supabase = createClient()

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    })

    if (signInError) {
      setAuthError(signInError.message)
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setAuthError('Unable to sign in. Please try again.')
      return
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.role) {
      setAuthError('Profile not found. Please contact support.')
      return
    }

    const redirectTo = searchParams.get('redirectTo')
    const destination = getPostAuthRedirect(
      profile.role as UserRole,
      redirectTo
    )

    router.push(destination)
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
            SIGN IN
          </CardTitle>
          <CardDescription>
            Access your customer portal, sweeper app, or admin dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                aria-invalid={Boolean(errors.password)}
                {...register('password')}
              />
              {errors.password ? (
                <p className="text-sm text-tornado">
                  {errors.password.message}
                </p>
              ) : null}
            </div>

            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="text-sm text-sky-DEFAULT hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            {authError ? (
              <p className="rounded-lg bg-tornado/10 px-3 py-2 text-sm text-tornado">
                {authError}
              </p>
            ) : null}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-10 w-full bg-sky-DEFAULT text-base text-white hover:bg-sky-dark"
            >
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link
              href="/register"
              className="font-medium text-sky-DEFAULT hover:underline"
            >
              Create one
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
