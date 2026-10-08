import assert from 'node:assert/strict'
import { test } from 'node:test'

import { googleMapsRouteUrl, orderRoute, type RouteStop } from '@/lib/sweepers/route'

// Points along a line east of Norman (roughly 1 km apart per 0.01° lng).
const at = (lng: number): { lat: number; lng: number } => ({ lat: 35.22, lng })
const stop = (id: string, window: number | null, lng: number | null): RouteStop => ({
  id,
  address: `${id} St, Norman, OK`,
  window,
  coords: lng === null ? null : at(lng),
})
const ids = (r: RouteStop[]): string => r.map((s) => s.id).join(',')

test('arrival windows always come first, in order', () => {
  // The afternoon stop is closest to the morning one, but must still be last.
  const r = orderRoute([stop('pm', 2, -97.44), stop('am', 0, -97.45), stop('mid', 1, -97.3)])
  assert.equal(ids(r), 'am,mid,pm')
})

test('inside a window, drive to the nearest next stop', () => {
  // Morning: a (west) then nearest is b (close), then c (far east).
  const r = orderRoute([stop('first', 0, -97.5), stop('c', 1, -97.2), stop('b', 1, -97.48), stop('d', 1, -97.35)])
  assert.equal(ids(r), 'first,b,d,c')
})

test('flexible visits go where they add the least driving', () => {
  const r = orderRoute([stop('a', 0, -97.5), stop('b', 2, -97.3), stop('flex', null, -97.4)])
  assert.equal(ids(r), 'a,flex,b')
})

test('unlocated stops keep window order; unlocated flexible goes last', () => {
  const r = orderRoute([stop('x', 1, null), stop('y', 0, null), stop('f', null, null)])
  assert.equal(ids(r), 'y,x,f')
})

test('Google Maps link: last stop is the destination, the rest are waypoints', () => {
  const url = new URL(googleMapsRouteUrl(['1 A St', '2 B St', '3 C St'])!)
  assert.equal(url.searchParams.get('destination'), '3 C St')
  assert.equal(url.searchParams.get('waypoints'), '1 A St|2 B St')
  assert.equal(url.searchParams.get('travelmode'), 'driving')
  assert.equal(new URL(googleMapsRouteUrl(['1 A St'])!).searchParams.get('waypoints'), null)
  assert.equal(googleMapsRouteUrl([]), null)
})
