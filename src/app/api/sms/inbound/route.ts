import twilio from 'twilio'

import { parseKeyword, phoneKey } from '@/lib/sms/phone'
import { createServiceClient } from '@/lib/supabase/server'
import { getAppUrl, sendSms } from '@/lib/twilio'

/**
 * Twilio "A message comes in" webhook: https://<site>/api/sms/inbound
 * - STOP/START: record the opt-out (Twilio itself sends the carrier-required
 *   confirmation, so we don't reply and risk a duplicate)
 * - RESCHEDULE: reply with the portal link; office is notified
 * - anything else: logged + forwarded to ADMIN_PHONE_NUMBER
 * Requests must carry a valid X-Twilio-Signature.
 */
export const dynamic = 'force-dynamic'

const xml = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const twiml = (message?: string): Response =>
  new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${message ? `<Message>${xml(message)}</Message>` : ''}</Response>`, {
    headers: { 'Content-Type': 'text/xml' },
  })

export async function POST(req: Request): Promise<Response> {
  const authToken = process.env.TWILIO_AUTH_TOKEN
  if (!authToken) return Response.json({ error: 'Texting is not set up' }, { status: 503 })

  const form = await req.formData()
  const params: Record<string, string> = {}
  form.forEach((value, key) => {
    params[key] = String(value)
  })
  const signature = req.headers.get('x-twilio-signature') ?? ''
  const url = `${getAppUrl().replace(/\/$/, '')}/api/sms/inbound`
  if (!twilio.validateRequest(authToken, signature, url, params)) {
    return Response.json({ error: 'Invalid signature' }, { status: 403 })
  }

  try {
    const from = params.From ?? ''
    const body = (params.Body ?? '').slice(0, 1600)
    const key = phoneKey(from)
    const keyword = parseKeyword(body)
    const supabase = createServiceClient()

    const { data: candidates } = key
      ? await supabase.from('profiles').select('id, full_name, phone').like('phone', `%${key.slice(-4)}`)
      : { data: [] }
    const matches = (candidates ?? []).filter((p) => phoneKey(p.phone) === key)

    await supabase.from('sms_inbound').insert({
      from_phone: from,
      body,
      profile_id: matches[0]?.id ?? null,
      keyword,
      twilio_sid: params.MessageSid ?? null,
    })

    if (keyword === 'stop' || keyword === 'start') {
      if (matches.length) {
        const optOut = keyword === 'stop'
        await supabase
          .from('profiles')
          .update({ sms_opt_out: optOut, sms_opt_out_at: optOut ? new Date().toISOString() : null })
          .in('id', matches.map((m) => m.id))
      }
      return twiml()
    }
    if (keyword === 'help') return twiml()

    const who = matches[0]?.full_name ?? from
    const adminPhone = process.env.ADMIN_PHONE_NUMBER
    if (adminPhone) {
      try {
        await sendSms({
          to: adminPhone,
          body: `💬 Text from ${who}: “${body.slice(0, 300)}”${keyword === 'reschedule' ? ' (wants to reschedule)' : ''}`,
          trigger: 'admin_inbound_forward',
        })
      } catch (error) {
        console.error('[sms/inbound] forward failed', error)
      }
    }

    if (keyword === 'reschedule') {
      return twiml(
        `No problem! You can move your visit up to 48 hours before at ${getAppUrl()}/dashboard — or reply with a day and time that works and we'll help. – Storm Sweep`
      )
    }
    return twiml()
  } catch (error) {
    console.error('[sms/inbound]', error)
    return twiml()
  }
}
