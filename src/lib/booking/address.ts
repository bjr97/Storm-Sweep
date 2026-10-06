import { z } from 'zod'

/**
 * Service addresses are collected as separate street / city / state / ZIP
 * fields (all required) and stored on jobs.address as one canonical string:
 *   "123 Main St, Norman, OK 73069"
 * SERVICE_ADDRESS_PATTERN lets the API verify a submitted address has all parts.
 */

export type AddressParts = { address: string; city: string; state: string; zip: string }

export const ZIP_PATTERN = /^\d{5}(-\d{4})?$/

export const SERVICE_ADDRESS_PATTERN = /^.+,\s*[^,]+,\s*[A-Z]{2}\s+\d{5}(-\d{4})?$/

export const addressPartsSchema = z.object({
  address: z.string().trim().min(5, 'Enter your street address').max(120, 'Street address is too long'),
  city: z.string().trim().min(2, 'Enter your city').max(60, 'City is too long').regex(/^[A-Za-z .'-]+$/, 'Enter a valid city'),
  state: z
    .string()
    .trim()
    .transform((v) => v.toUpperCase())
    .pipe(z.string().regex(/^[A-Z]{2}$/, 'Use the 2-letter state code (e.g. OK)')),
  zip: z.string().trim().regex(ZIP_PATTERN, 'Enter a 5-digit ZIP code'),
})

export function formatServiceAddress(parts: AddressParts): string {
  return `${parts.address.trim()}, ${parts.city.trim()}, ${parts.state.trim().toUpperCase()} ${parts.zip.trim()}`
}

/** Best-effort split of a stored one-line address back into parts (for pre-fill). */
export function parseServiceAddress(value: string | null | undefined): AddressParts {
  const empty: AddressParts = { address: '', city: '', state: 'OK', zip: '' }
  if (!value) return empty
  const cleaned = value.trim().replace(/,\s*(USA|United States)$/i, '')
  const match = cleaned.match(/^(.+?),\s*([^,]+),\s*([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)$/)
  if (!match) return { ...empty, address: cleaned }
  return { address: match[1].trim(), city: match[2].trim(), state: match[3].toUpperCase(), zip: match[4] }
}

/** Google Places address_components -> parts (street number + route, locality, state, ZIP). */
export function partsFromPlace(
  components: { long_name: string; short_name: string; types: string[] }[] | undefined
): Partial<AddressParts> {
  if (!components) return {}
  const get = (type: string, short = false): string => {
    const c = components.find((x) => x.types.includes(type))
    return c ? (short ? c.short_name : c.long_name) : ''
  }
  const street = [get('street_number'), get('route')].filter(Boolean).join(' ')
  return {
    address: street || undefined,
    city: get('locality') || get('sublocality') || get('postal_town') || undefined,
    state: get('administrative_area_level_1', true) || undefined,
    zip: get('postal_code') || undefined,
  }
}
