import { CalendarPlus, CircleCheck, Star, type LucideIcon } from 'lucide-react'

import { EmptyState } from '@/components/admin/Panel'
import type { ActivityItem } from '@/lib/admin/dashboard'
import { formatRelative } from '@/lib/admin/time'
import { cn } from '@/lib/utils'

const KIND: Record<ActivityItem['kind'], { icon: LucideIcon; className: string; label: string }> = {
  booking: { icon: CalendarPlus, className: 'bg-sky/15 text-sky-light', label: 'Booking' },
  complete: { icon: CircleCheck, className: 'bg-[#27AE60]/15 text-[#2ECC71]', label: 'Completed' },
  review: { icon: Star, className: 'bg-[#8E44AD]/20 text-[#C39BD3]', label: 'Review' },
}

export function ActivityFeed({ items, now }: { items: ActivityItem[]; now: Date }): React.ReactElement {
  if (items.length === 0) {
    return <EmptyState>Bookings, completed jobs, and reviews will show up here.</EmptyState>
  }

  return (
    <ul>
      {items.map((item) => {
        const kind = KIND[item.kind]
        return (
          <li key={item.id} className="flex gap-3 border-b border-white/[0.07] py-2.5 last:border-b-0">
            <div className={cn('flex size-[30px] shrink-0 items-center justify-center rounded-lg', kind.className)}>
              <kind.icon className="size-3.5" aria-label={kind.label} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs leading-relaxed text-[#F0F0F0]">{item.title}</p>
              <p className="mt-0.5 truncate text-[11px] text-[#8A8A8F]">
                {formatRelative(item.at, now)}
                {item.detail ? ` · ${item.detail}` : ''}
              </p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
