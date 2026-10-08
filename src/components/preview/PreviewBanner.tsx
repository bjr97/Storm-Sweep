import { cookies } from 'next/headers'

import { ExitPreviewButton } from '@/components/preview/ExitPreviewButton'
import { parseViewAs, VIEW_AS_COOKIE } from '@/lib/demo'
import { cn } from '@/lib/utils'

/** Shown across the customer + Sweeper portals while an admin is previewing. */
export function PreviewBanner(): React.ReactElement | null {
  const preview = parseViewAs(cookies().get(VIEW_AS_COOKIE)?.value)
  if (!preview) return null
  return (
    <div
      role="status"
      className={cn(
        'flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2 text-center font-[family-name:var(--font-barlow)] text-[13px] font-semibold',
        preview.demo ? 'bg-wheat text-shelter' : 'bg-tornado text-white'
      )}
    >
      <span>
        Previewing as {preview.name} ({preview.role === 'customer' ? 'customer' : 'Sweeper'})
        {preview.demo ? ' · demo account, actions work' : ' · real account, read-only'}
      </span>
      <ExitPreviewButton className={preview.demo ? 'bg-shelter text-white hover:bg-black' : 'bg-white text-tornado hover:bg-white/90'} />
    </div>
  )
}
