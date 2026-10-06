'use client'

import { LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { createClient } from '@/lib/supabase/client'

export function SignOutButton(): React.ReactElement {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function signOut(): Promise<void> {
    setBusy(true)
    await createClient().auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={() => void signOut()}
      disabled={busy}
      className="inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold text-[#9A9A9F] hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
    >
      <LogOut className="size-4" aria-hidden="true" /> Sign out
    </button>
  )
}
