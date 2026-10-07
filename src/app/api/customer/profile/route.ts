import { z } from 'zod'

import { requireRole } from '@/lib/auth/requireRole'
import { SERVICE_ADDRESS_PATTERN } from '@/lib/booking/address'
import { updateCustomerProfile } from '@/lib/customer/actions'

const bodySchema = z
  .object({
    full_name: z.string().trim().min(2, 'Enter your name').max(100),
    phone: z.string().trim().min(10, 'Enter a valid phone number').max(20).regex(/^[\d\s()+-]+$/, 'Enter a valid phone number'),
    address: z
      .string()
      .trim()
      .max(250)
      .regex(SERVICE_ADDRESS_PATTERN, 'Use the format: 123 Main St, Norman, OK 73069'),
    marketing_photo_consent: z.boolean(),
  })
  .partial()

export async function PATCH(req: Request): Promise<Response> {
  try {
    const auth = await requireRole('customer')
    if (!auth.authorized) return Response.json({ error: 'Not authorized' }, { status: auth.status })
    const parsed = bodySchema.safeParse(await req.json())
    if (!parsed.success) {
      const first = parsed.error.issues[0]?.message ?? 'Invalid input'
      return Response.json({ error: first, details: parsed.error.flatten() }, { status: 400 })
    }
    return Response.json({ data: await updateCustomerProfile(auth.userId, parsed.data) })
  } catch (error) {
    console.error('[customer/profile]', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
