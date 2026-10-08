/**
 * Day route for a Sweeper (pure — no I/O, unit-tested).
 *
 * Customers pick arrival windows, so windows always come first: stops are
 * visited window by window (Morning → Midday → …). Inside a window we drive to
 * the nearest next stop. "Flexible" visits (any time) are slotted wherever they
 * add the least driving. Stops we couldn't locate keep their window order.
 */

export type LatLng = { lat: number; lng: number }

export type RouteStop = {
  id: string
  address: string
  /** Index in TIME_WINDOWS order; null = flexible (any time). */
  window: number | null
  coords: LatLng | null
}

/** Straight-line distance in km (good enough to order a handful of stops). */
export function distanceKm(a: LatLng, b: LatLng): number {
  const rad = (d: number): number => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}

function legKm(a: RouteStop | undefined, b: RouteStop | undefined): number {
  return a?.coords && b?.coords ? distanceKm(a.coords, b.coords) : 0
}

export function orderRoute(stops: RouteStop[]): RouteStop[] {
  const fixed = stops.filter((s) => s.window !== null)
  const flexible = stops.filter((s) => s.window === null)

  // 1) Windows in order; nearest-neighbour inside each window.
  const route: RouteStop[] = []
  const windows = Array.from(new Set(fixed.map((s) => s.window as number))).sort((a, b) => a - b)
  for (const w of windows) {
    const pool = fixed.filter((s) => s.window === w)
    while (pool.length > 0) {
      const prev = route[route.length - 1]
      let best = 0
      if (prev?.coords) {
        let bestKm = Infinity
        pool.forEach((s, i) => {
          if (s.coords && distanceKm(prev.coords!, s.coords) < bestKm) {
            bestKm = distanceKm(prev.coords!, s.coords)
            best = i
          }
        })
      }
      route.push(pool.splice(best, 1)[0])
    }
  }

  // 2) Flexible stops: cheapest insertion (least extra driving).
  for (const s of flexible) {
    if (!s.coords || route.length === 0) {
      route.push(s)
      continue
    }
    let bestAt = route.length
    let bestCost = Infinity
    for (let i = 0; i <= route.length; i++) {
      const before = route[i - 1]
      const after = route[i]
      const cost = legKm(before, s) + legKm(s, after) - legKm(before, after)
      if (cost < bestCost) {
        bestCost = cost
        bestAt = i
      }
    }
    route.splice(bestAt, 0, s)
  }
  return route
}

/** One Google Maps link for the whole drive, starting from where the phone is. */
export function googleMapsRouteUrl(addresses: string[]): string | null {
  if (addresses.length === 0) return null
  const params = new URLSearchParams({ api: '1', destination: addresses[addresses.length - 1], travelmode: 'driving' })
  // Google allows up to 9 waypoints in a link; Sweepers max out at 5 jobs a day.
  const waypoints = addresses.slice(0, -1).slice(0, 9)
  if (waypoints.length > 0) params.set('waypoints', waypoints.join('|'))
  return `https://www.google.com/maps/dir/?${params.toString()}`
}

/** Turn-by-turn to a single stop. */
export function googleMapsStopUrl(address: string): string {
  return `https://www.google.com/maps/dir/?${new URLSearchParams({ api: '1', destination: address, travelmode: 'driving' }).toString()}`
}

