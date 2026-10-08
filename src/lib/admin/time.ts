/**
 * Business-time helpers. Storm Sweep operates in Norman, OK, so "today",
 * "this week" and "this month" are America/Chicago calendar periods — not the
 * server's UTC clock. Handles DST by resolving each local midnight separately.
 */
export const BUSINESS_TZ = 'America/Chicago'

type LocalDate = { year: number; month: number; day: number; weekday: number }

const partsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: BUSINESS_TZ,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  weekday: 'short',
})

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function readParts(date: Date): LocalDate & { hour: number; minute: number; second: number } {
  const parts = partsFormatter.formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((p) => p.type === type)?.value ?? '0'
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    hour: Number(get('hour')),
    minute: Number(get('minute')),
    second: Number(get('second')),
    weekday: WEEKDAYS.indexOf(get('weekday')),
  }
}

/** Offset of business time from UTC at an instant, in ms (negative for Chicago). */
function offsetMs(date: Date): number {
  const p = readParts(date)
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
  return asUtc - Math.floor(date.getTime() / 1000) * 1000
}

/** UTC instant of local midnight for a business-calendar date (month is 1-based; overflow OK). */
export function localMidnight(year: number, month: number, day: number): Date {
  return localDateTime(year, month, day)
}

/**
 * UTC instant of a business-local wall-clock time. Use this instead of
 * "midnight + N hours", which is an hour off on DST-change days.
 */
export function localDateTime(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute))
  const first = new Date(guess.getTime() - offsetMs(guess))
  // Re-check once in case the guess and the real midnight straddle a DST change.
  return new Date(guess.getTime() - offsetMs(first))
}

export function localDate(date: Date): LocalDate {
  const { year, month, day, weekday } = readParts(date)
  return { year, month, day, weekday }
}

export type Range = { start: Date; end: Date }

export function dayRange(now: Date = new Date()): Range {
  const d = localDate(now)
  return { start: localMidnight(d.year, d.month, d.day), end: localMidnight(d.year, d.month, d.day + 1) }
}

/** Monday-start week containing `now`, shifted by `weeksAgo`. */
export function weekRange(now: Date = new Date(), weeksAgo = 0): Range {
  const d = localDate(now)
  const daysSinceMonday = (d.weekday + 6) % 7
  const startDay = d.day - daysSinceMonday - weeksAgo * 7
  return {
    start: localMidnight(d.year, d.month, startDay),
    end: localMidnight(d.year, d.month, startDay + 7),
  }
}

export function monthRange(now: Date = new Date(), monthsAgo = 0): Range {
  const d = localDate(now)
  return {
    start: localMidnight(d.year, d.month - monthsAgo, 1),
    end: localMidnight(d.year, d.month - monthsAgo + 1, 1),
  }
}

/** Calendar year (business time) containing `now` — e.g. for 1099 totals. */
export function yearRange(now: Date = new Date()): Range {
  const d = localDate(now)
  return { start: localMidnight(d.year, 1, 1), end: localMidnight(d.year + 1, 1, 1) }
}

export function formatBusinessTime(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TZ,
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso))
}

export function formatBusinessDate(date: Date, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: BUSINESS_TZ, ...options }).format(date)
}

/** "4 min ago", "2 hrs ago", "Yesterday", "Oct 3". */
export function formatRelative(iso: string, now: Date = new Date()): string {
  const diffMin = Math.round((now.getTime() - new Date(iso).getTime()) / 60000)
  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin} min ago`
  const diffHr = Math.round(diffMin / 60)
  if (diffHr < 24) return `${diffHr} hr${diffHr === 1 ? '' : 's'} ago`
  if (diffHr < 48) return 'Yesterday'
  return formatBusinessDate(new Date(iso), { month: 'short', day: 'numeric' })
}
