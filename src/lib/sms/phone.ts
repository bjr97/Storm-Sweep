/**
 * US phone helpers + carrier-standard SMS keywords (pure).
 * Carriers expect E.164 (+14055550101); profiles store whatever was typed.
 */

/** "405-555-0101", "(405) 555 0101", "+1 405…" -> "+14055550101"; null if not a US number. */
export function toE164(raw: string | null | undefined): string | null {
  if (!raw) return null
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return null
}

/** Last 10 digits — how numbers are compared regardless of formatting. */
export function phoneKey(raw: string | null | undefined): string | null {
  const e164 = toE164(raw)
  return e164 ? e164.slice(-10) : null
}

export type SmsKeyword = 'stop' | 'start' | 'help' | 'reschedule' | null

const STOP = new Set(['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT', 'OPTOUT', 'REVOKE'])
const START = new Set(['START', 'UNSTOP', 'YES', 'OPTIN'])
const HELP = new Set(['HELP', 'INFO'])

/** Carrier keywords only count when they are the whole message (e.g. "Stop", "STOP."). */
export function parseKeyword(body: string): SmsKeyword {
  const word = body.trim().toUpperCase().replace(/[^A-Z]/g, '')
  if (STOP.has(word)) return 'stop'
  if (START.has(word)) return 'start'
  if (HELP.has(word)) return 'help'
  if (word === 'RESCHEDULE') return 'reschedule'
  return null
}
