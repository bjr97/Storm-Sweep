import { randomBytes, randomUUID } from 'node:crypto'
import { deflateSync } from 'node:zlib'

import { localDate, localDateTime } from '@/lib/admin/time'
import { TIME_WINDOWS } from '@/lib/booking/timeWindows'
import { DEMO_EMAILS } from '@/lib/demo'
import { createServiceClient } from '@/lib/supabase/server'
import { calculateDeposit, PRICING } from '@/lib/utils'

/**
 * Demo customer + demo Sweeper for admin previews (server-only). Everything is
 * flagged is_demo, so it stays out of reports, the real job board, payouts,
 * texts and emails. reset = wipe and rebuild from scratch.
 */

type Rgb = [number, number, number]

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
function crc(buf: Buffer): number {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type), data])
  const sum = Buffer.alloc(4)
  sum.writeUInt32BE(crc(td))
  return Buffer.concat([len, td, sum])
}

/** Placeholder "photo": a soft vertical gradient (dusty for before, bright for after). */
function placeholderPng(top: Rgb, bottom: Rgb): Buffer {
  const w = 640
  const h = 480
  const raw = Buffer.alloc((w * 3 + 1) * h)
  for (let y = 0; y < h; y++) {
    const t = y / (h - 1)
    const row = y * (w * 3 + 1)
    for (let x = 0; x < w; x++) {
      for (let c = 0; c < 3; c++) raw[row + 1 + x * 3 + c] = Math.round(top[c] + (bottom[c] - top[c]) * t)
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8
  ihdr[9] = 2
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const BEFORE: [Rgb, Rgb] = [[0x6b, 0x5a, 0x45], [0x3a, 0x30, 0x26]]
const AFTER: [Rgb, Rgb] = [[0xe8, 0xee, 0xf2], [0xb7, 0xc6, 0xd1]]

export type DemoAccounts = { customerId: string; sweeperId: string }

async function wipe(): Promise<void> {
  const supabase = createServiceClient()
  const { data: people } = await supabase.from('profiles').select('id').eq('is_demo', true)
  const ids = (people ?? []).map((p) => p.id)
  const { data: jobs } = await supabase.from('jobs').select('id').eq('is_demo', true)
  const jobIds = (jobs ?? []).map((j) => j.id)
  if (jobIds.length) {
    const { data: photos } = await supabase.from('job_photos').select('storage_path').in('job_id', jobIds)
    const paths = (photos ?? []).map((p) => p.storage_path)
    if (paths.length) await supabase.storage.from('job-photos').remove(paths)
    await supabase.from('job_photos').delete().in('job_id', jobIds)
    await supabase.from('reviews').delete().in('job_id', jobIds)
    await supabase.from('job_issues').delete().in('job_id', jobIds)
    await supabase.from('jobs').delete().in('id', jobIds)
  }
  for (const id of ids) await supabase.auth.admin.deleteUser(id)
}

async function makePerson(
  email: string,
  name: string,
  profile: Record<string, unknown>
): Promise<string> {
  const supabase = createServiceClient()
  // Never signed into with a password: previews use a one-time server-side link.
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: randomBytes(24).toString('base64url'),
    email_confirm: true,
    user_metadata: { full_name: name },
  })
  if (error) throw error
  const { error: pErr } = await supabase
    .from('profiles')
    .update({ full_name: name, phone: null, is_demo: true, ...profile })
    .eq('id', data.user.id)
  if (pErr) throw pErr
  return data.user.id
}

/** ISO time for a window start N days from today (business time). */
function windowStart(daysFromToday: number, window: 'morning' | 'midday' | 'afternoon'): string {
  const t = localDate(new Date())
  const hour = TIME_WINDOWS.find((w) => w.value === window)?.startHour ?? 8
  return localDateTime(t.year, t.month, t.day + daysFromToday, hour).toISOString()
}

export async function resetDemoData(): Promise<DemoAccounts> {
  await wipe()
  const supabase = createServiceClient()
  const address = '1200 W Lindsey St, Norman, OK 73069'
  const customerId = await makePerson(DEMO_EMAILS.customer, 'Dana Demo', { role: 'customer', address })
  const sweeperId = await makePerson(DEMO_EMAILS.sweeper, 'Sam Demo', { role: 'sweeper', sweeper_available: true })

  const standard = PRICING.shelter.standard
  const led = PRICING.addons.led_package
  const doneAt = windowStart(-45, 'morning')
  const doneTotal = standard + led
  const upcomingTotal = standard
  const openTotal = PRICING.shelter.large

  const base = { customer_id: customerId, address, membership_visit: false, is_demo: true }
  const { data: jobs, error } = await supabase
    .from('jobs')
    .insert([
      {
        ...base,
        status: 'complete',
        shelter_size: 'standard',
        service_type: ['Deep Clean', 'LED Lighting Package'],
        scheduled_at: doneAt,
        time_window: 'morning',
        total_amount: doneTotal,
        service_value: doneTotal,
        deposit_amount: calculateDeposit(doneTotal),
        payment_status: 'paid',
        sweeper_id: sweeperId,
        assigned_via: 'claim',
        claim_visible_at: windowStart(-50, 'morning'),
        claimed_at: windowStart(-50, 'midday'),
        en_route_at: doneAt,
        arrived_at: doneAt,
        arrival_verified: true,
        customer_signed_at: new Date(new Date(doneAt).getTime() + 2 * 3600e3).toISOString(),
        customer_signature_name: 'Dana Demo',
        completed_at: new Date(new Date(doneAt).getTime() + 2 * 3600e3).toISOString(),
      },
      {
        ...base,
        status: 'confirmed',
        shelter_size: 'standard',
        service_type: ['Deep Clean'],
        scheduled_at: windowStart(6, 'morning'),
        time_window: 'morning',
        total_amount: upcomingTotal,
        service_value: upcomingTotal,
        deposit_amount: calculateDeposit(upcomingTotal),
        payment_status: 'deposit_paid',
        sweeper_id: sweeperId,
        assigned_via: 'claim',
        claim_visible_at: new Date(Date.now() - 26 * 3600e3).toISOString(),
        claimed_at: new Date(Date.now() - 25 * 3600e3).toISOString(),
      },
      {
        ...base,
        status: 'confirmed',
        shelter_size: 'large',
        service_type: ['Deep Clean'],
        scheduled_at: windowStart(9, 'afternoon'),
        time_window: 'afternoon',
        total_amount: openTotal,
        service_value: openTotal,
        deposit_amount: calculateDeposit(openTotal),
        payment_status: 'deposit_paid',
        notes: 'Demo job: claim it from the Sweeper app to try the full visit flow.',
      },
    ])
    .select('id, status')
  if (error) throw error

  const done = jobs.find((j) => j.status === 'complete')!
  const photos: { type: 'before' | 'after'; png: Buffer }[] = [
    { type: 'before', png: placeholderPng(...BEFORE) },
    { type: 'before', png: placeholderPng(BEFORE[1], BEFORE[0]) },
    { type: 'after', png: placeholderPng(...AFTER) },
    { type: 'after', png: placeholderPng(AFTER[1], AFTER[0]) },
  ]
  for (const p of photos) {
    const path = `jobs/${done.id}/${p.type}/${randomUUID()}.png`
    const { error: upErr } = await supabase.storage.from('job-photos').upload(path, p.png, { contentType: 'image/png' })
    if (upErr) throw upErr
    await supabase.from('job_photos').insert({
      job_id: done.id,
      photo_type: p.type,
      storage_path: path,
      uploaded_by: sweeperId,
      customer_consent: false,
    })
  }
  await supabase.from('reviews').insert({
    job_id: done.id,
    customer_id: customerId,
    rating: 5,
    body: 'Spotless shelter and the new lights are great. (Demo review)',
    photo_consent: false,
  })
  return { customerId, sweeperId }
}

/** Existing demo accounts, creating them on first use. */
export async function ensureDemoData(): Promise<DemoAccounts> {
  const supabase = createServiceClient()
  const { data } = await supabase.from('profiles').select('id, role').eq('is_demo', true)
  const customer = data?.find((p) => p.role === 'customer')
  const sweeper = data?.find((p) => p.role === 'sweeper')
  if (customer && sweeper) return { customerId: customer.id, sweeperId: sweeper.id }
  return resetDemoData()
}
