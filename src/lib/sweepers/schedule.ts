import { dayRange, localMidnight, localDate } from '@/lib/admin/time'
import { TIME_WINDOWS } from '@/lib/booking/timeWindows'
import { geocodeAddress } from '@/lib/sweepers/jobRunServer'
import { googleMapsRouteUrl, orderRoute, type LatLng } from '@/lib/sweepers/route'
import { createServiceClient } from '@/lib/supabase/server'
import type { Job } from '@/types/database'

/** A Sweeper's own jobs for the next 7 days, grouped by business day (server-only). */

export type ScheduleJob = Pick<Job, 'id' | 'status' | 'scheduled_at' | 'time_window' | 'address' | 'service_type' | 'shelter_size' | 'membership_visit'> & {
  customerFirstName: string
  isMember: boolean
}
export type ScheduleDay = { key: string; date: Date; isToday: boolean; jobs: ScheduleJob[] }

const windowOrder = (j: ScheduleJob): number => {
  const i = TIME_WINDOWS.findIndex((w) => w.value === j.time_window)
  return i === -1 ? 99 : i
}

export async function getSweeperWeek(sweeperId: string, now: Date = new Date()): Promise<ScheduleDay[]> {
  const today = localDate(now)
  const days: ScheduleDay[] = Array.from({ length: 7 }, (_, i) => {
    const date = localMidnight(today.year, today.month, today.day + i)
    const d = localDate(date)
    return { key: `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`, date, isToday: i === 0, jobs: [] }
  })

  const supabase = createServiceClient()
  const { data: jobs, error } = await supabase
    .from('jobs')
    .select('id, status, scheduled_at, time_window, address, service_type, shelter_size, membership_visit, customer_id')
    .eq('sweeper_id', sweeperId)
    .neq('status', 'cancelled')
    .gte('scheduled_at', dayRange(now).start.toISOString())
    .lt('scheduled_at', localMidnight(today.year, today.month, today.day + 7).toISOString())
    .order('scheduled_at')
  if (error) throw error

  const { data: people } = jobs.length
    ? await supabase.from('profiles').select('id, full_name, membership_status').in('id', Array.from(new Set(jobs.map((j) => j.customer_id))))
    : { data: [] }
  const person = new Map((people ?? []).map((p) => [p.id, p]))

  for (const j of jobs) {
    if (!j.scheduled_at) continue
    const start = dayRange(new Date(j.scheduled_at)).start.getTime()
    const day = days.find((d) => d.date.getTime() === start)
    if (!day) continue
    const p = person.get(j.customer_id)
    day.jobs.push({
      ...j,
      customerFirstName: (p?.full_name ?? 'Customer').split(/\s+/)[0],
      isMember: p?.membership_status === 'active' || j.membership_visit,
    })
  }
  for (const d of days) d.jobs.sort((a, b) => windowOrder(a) - windowOrder(b) || (a.scheduled_at ?? '').localeCompare(b.scheduled_at ?? ''))
  return days
}

// ---- Day route ---------------------------------------------------------------

// Addresses rarely change; remember lookups for the life of the server.
const geoCache = new Map<string, LatLng | null>()

async function locate(address: string): Promise<LatLng | null> {
  if (!geoCache.has(address)) geoCache.set(address, await geocodeAddress(address))
  return geoCache.get(address) ?? null
}

export type DayRoute = { stops: ScheduleJob[]; mapsUrl: string | null }

/** Remaining visits for a day in driving order (see orderRoute) + one Google Maps link. */
export async function getDayRoute(jobs: ScheduleJob[]): Promise<DayRoute> {
  const remaining = jobs.filter((j) => j.status === 'confirmed' || j.status === 'in_progress')
  const coords = await Promise.all(remaining.map((j) => locate(j.address)))
  const ordered = orderRoute(
    remaining.map((j, i) => ({
      id: j.id,
      address: j.address,
      window: j.time_window === 'flexible' ? null : windowOrder(j),
      coords: coords[i],
    }))
  )
  const byId = new Map(remaining.map((j) => [j.id, j]))
  const stops = ordered.map((s) => byId.get(s.id)!)
  return { stops, mapsUrl: googleMapsRouteUrl(stops.map((s) => s.address)) }
}
