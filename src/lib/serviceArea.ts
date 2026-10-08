import { createServiceClient } from '@/lib/supabase/server'

/** Service area = ZIPs we book online (server-only). No ZIPs configured = everywhere. */

/** ZIP from a "Street, City, ST 12345" service address. */
export function zipFromAddress(address: string): string | null {
  return address.trim().match(/\b(\d{5})(?:-\d{4})?$/)?.[1] ?? null
}

export async function isServedZip(zip: string): Promise<boolean> {
  const supabase = createServiceClient()
  const { count, error } = await supabase.from('service_zips').select('zip', { count: 'exact', head: true })
  if (error) throw error
  if (!count) return true
  const { data } = await supabase.from('service_zips').select('zip').eq('zip', zip).maybeSingle()
  return Boolean(data)
}

export type ZipDemand = { zip: string; count: number; latest: string; pending: number }

/** Waitlist grouped by ZIP, busiest first (admin). */
export async function getWaitlistDemand(): Promise<{ demand: ZipDemand[]; total: number }> {
  const { data, error } = await createServiceClient().from('waitlist').select('zip, created_at, notified_at').order('created_at', { ascending: false }).limit(5000)
  if (error) throw error
  const map = new Map<string, ZipDemand>()
  for (const w of data) {
    const d = map.get(w.zip) ?? { zip: w.zip, count: 0, latest: w.created_at, pending: 0 }
    d.count += 1
    if (!w.notified_at) d.pending += 1
    map.set(w.zip, d)
  }
  return { demand: Array.from(map.values()).sort((a, b) => b.count - a.count || b.latest.localeCompare(a.latest)), total: data.length }
}
