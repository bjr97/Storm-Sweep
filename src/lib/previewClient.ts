import { parseViewAs, VIEW_AS_COOKIE, type ViewAs } from '@/lib/demo'

/** Browser-side: the admin preview this tab is in, if any. */
export function currentPreview(): ViewAs | null {
  if (typeof document === 'undefined') return null
  const raw = document.cookie
    .split('; ')
    .find((c) => c.startsWith(`${VIEW_AS_COOKIE}=`))
    ?.slice(VIEW_AS_COOKIE.length + 1)
  return parseViewAs(raw)
}

/** Leave the preview and return to the admin portal. */
export async function exitPreview(): Promise<void> {
  let to = '/admin/view-as'
  try {
    const res = await fetch('/api/admin/view-as/exit', { method: 'POST' })
    const json = (await res.json()) as { data?: { redirect?: string } }
    to = json.data?.redirect ?? to
  } catch {
    to = '/login'
  }
  window.location.assign(to)
}
