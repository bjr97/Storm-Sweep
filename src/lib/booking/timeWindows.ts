import { formatBusinessTime, localMidnight } from '@/lib/admin/time'
import type { TimeWindow } from '@/types/database'

/** Customer arrival windows (booking Step 3). Hours are America/Chicago. */
export const TIME_WINDOWS: readonly { value: TimeWindow; label: string; hours: string; startHour: number }[] = [
  { value: 'morning', label: 'Morning', hours: '8–11am', startHour: 8 },
  { value: 'midday', label: 'Midday', hours: '11am–2pm', startHour: 11 },
  { value: 'afternoon', label: 'Afternoon', hours: '2–5pm', startHour: 14 },
  { value: 'evening', label: 'Evening', hours: '5–8pm', startHour: 17 },
  { value: 'flexible', label: 'Flexible', hours: 'Any time 8am–8pm', startHour: 8 },
]

export const TIME_WINDOW_VALUES = ['morning', 'midday', 'afternoon', 'evening', 'flexible'] as const

export function timeWindowLabel(value: TimeWindow | null | undefined): string | null {
  const w = TIME_WINDOWS.find((t) => t.value === value)
  if (!w) return null
  return w.value === 'flexible' ? 'Flexible (8am–8pm)' : `${w.label} ${w.hours}`
}

/**
 * scheduled_at for a booking: the start of the chosen window on that business
 * date (e.g. "2026-11-20" + afternoon -> 2pm Chicago, as a UTC ISO string).
 */
export function windowStartIso(date: string, window: TimeWindow): string {
  const [y, m, d] = date.split('-').map(Number)
  const startHour = TIME_WINDOWS.find((t) => t.value === window)?.startHour ?? 8
  return new Date(localMidnight(y, m, d).getTime() + startHour * 3_600_000).toISOString()
}

/** What to show for a job's time: its arrival window, else the start time (older jobs). */
export function jobTimeLabel(scheduledAt: string | null, window: TimeWindow | null | undefined, short = false): string {
  const w = TIME_WINDOWS.find((t) => t.value === window)
  if (w) return short ? w.label : timeWindowLabel(w.value) ?? w.label
  if (!scheduledAt) return '—'
  const time = formatBusinessTime(scheduledAt)
  return short ? time.replace(':00', '') : time
}
