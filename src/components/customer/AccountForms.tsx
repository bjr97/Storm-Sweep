'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { createClient } from '@/lib/supabase/client'

const input = 'mt-1 h-11 w-full rounded-lg border border-black/15 bg-white px-3 outline-none focus-visible:border-sky focus-visible:ring-2 focus-visible:ring-sky/30'
const button = 'h-11 rounded-lg bg-sky px-5 font-semibold text-white hover:bg-sky-dark disabled:opacity-50'

async function patchProfile(body: Record<string, unknown>): Promise<string | null> {
  try {
    const res = await fetch('/api/customer/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) return ((await res.json()) as { error?: string }).error ?? 'Could not save'
    return null
  } catch {
    return 'Could not reach the server — try again'
  }
}

export function ProfileForm({ initial }: { initial: { full_name: string; phone: string; address: string } }): React.ReactElement {
  const router = useRouter()
  const [values, setValues] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  async function save(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setBusy(true)
    const error = await patchProfile(values)
    setBusy(false)
    setMessage(error ? { ok: false, text: error } : { ok: true, text: 'Saved.' })
    if (!error) router.refresh()
  }

  const set = (k: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) => setValues((v) => ({ ...v, [k]: e.target.value }))
  return (
    <form onSubmit={(e) => void save(e)} className="space-y-3">
      <label className="block text-sm font-semibold">
        Name
        <input value={values.full_name} onChange={set('full_name')} autoComplete="name" className={input} />
      </label>
      <label className="block text-sm font-semibold">
        Mobile phone <span className="font-normal text-[#6B6B70]">(visit reminders by text)</span>
        <input value={values.phone} onChange={set('phone')} type="tel" autoComplete="tel" className={input} />
      </label>
      <label className="block text-sm font-semibold">
        Home address
        <input value={values.address} onChange={set('address')} autoComplete="street-address" placeholder="123 Main St, Norman, OK 73069" className={input} />
      </label>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={busy} className={button}>{busy ? 'Saving…' : 'Save changes'}</button>
        {message ? <p role={message.ok ? 'status' : 'alert'} className={message.ok ? 'text-sm font-semibold text-[#1E7D46]' : 'text-sm font-semibold text-tornado'}>{message.text}</p> : null}
      </div>
    </form>
  )
}

export function PhotoConsentToggle({ initial }: { initial: boolean }): React.ReactElement {
  const [on, setOn] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function toggle(next: boolean): Promise<void> {
    setOn(next)
    setBusy(true)
    const err = await patchProfile({ marketing_photo_consent: next })
    setBusy(false)
    if (err) {
      setOn(!next)
      setError(err)
    } else setError(null)
  }

  return (
    <div className="space-y-2">
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={on}
          disabled={busy}
          onChange={(e) => void toggle(e.target.checked)}
          className="mt-1 size-5 shrink-0 accent-sky"
        />
        <span className="text-sm">
          <span className="font-semibold">OK to share my before &amp; after photos in Storm Sweep marketing</span>
          <span className="block text-[#6B6B70]">
            Social media and our website only. Never your name, address, or anything that identifies your home. Applies to past and future visits — turn it off any time.
          </span>
        </span>
      </label>
      {error ? <p role="alert" className="text-sm font-semibold text-tornado">{error}</p> : null}
    </div>
  )
}

export function PasswordForm(): React.ReactElement {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  async function save(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (password.length < 8) return setMessage({ ok: false, text: 'Use at least 8 characters' })
    if (password !== confirm) return setMessage({ ok: false, text: 'Passwords don’t match' })
    setBusy(true)
    const { error } = await createClient().auth.updateUser({ password })
    setBusy(false)
    if (error) return setMessage({ ok: false, text: error.message })
    setPassword('')
    setConfirm('')
    setMessage({ ok: true, text: 'Password updated.' })
  }

  return (
    <form onSubmit={(e) => void save(e)} className="space-y-3">
      <label className="block text-sm font-semibold">
        New password
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" className={input} />
      </label>
      <label className="block text-sm font-semibold">
        Confirm new password
        <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" className={input} />
      </label>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={busy || !password} className={button}>{busy ? 'Updating…' : 'Update password'}</button>
        {message ? <p role={message.ok ? 'status' : 'alert'} className={message.ok ? 'text-sm font-semibold text-[#1E7D46]' : 'text-sm font-semibold text-tornado'}>{message.text}</p> : null}
      </div>
    </form>
  )
}
