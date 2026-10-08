import { z } from 'zod'

import { isServedZip } from '@/lib/serviceArea'

export const dynamic = 'force-dynamic'

// Public: do we book this ZIP online? (Checkout re-checks.)
const querySchema = z.object({ zip: z.string().regex(/^\d{5}$/) })

export async function GET(req: Request): Promise<Response> {
  try {
    const parsed = querySchema.safeParse(Object.fromEntries(new URL(req.url).searchParams))
    if (!parsed.success) return Response.json({ error: 'Enter a 5-digit ZIP code' }, { status: 400 })
    return Response.json({ data: { zip: parsed.data.zip, served: await isServedZip(parsed.data.zip) } })
  } catch (error) {
    console.error('[service-area]', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
