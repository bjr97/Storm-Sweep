import { Suspense } from 'react'

import { LoginForm } from '@/components/auth/LoginForm'

export default function LoginPage(): React.ReactElement {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Suspense
        fallback={
          <div className="text-sm text-muted-foreground">Loading…</div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  )
}
