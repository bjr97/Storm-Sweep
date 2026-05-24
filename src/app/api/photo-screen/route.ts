import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'

const photoScreenSchema = z.object({
  image: z.string().min(1),
  mediaType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  bookingId: z.string().uuid().optional(),
  storagePath: z.string().optional(),
})

const screeningResponseSchema = z.object({
  grade: z.enum(['A', 'B', 'C', 'D', 'F']),
  approved: z.boolean(),
  flags: z.array(z.string()).default([]),
  surcharge_suggested: z.boolean().default(false),
  surcharge_amount: z.number().default(0),
  admin_note: z.string().default(''),
  customer_message: z.string(),
})

type ScreeningResponse = z.infer<typeof screeningResponseSchema>

function getDefaultMessage(grade: ScreeningResponse['grade']): string {
  if (grade === 'A' || grade === 'B') {
    return 'Looks great! Your booking is confirmed.'
  }
  if (grade === 'C') {
    return "We'll review this and confirm within 2 hours."
  }
  return 'Our team will contact you shortly to discuss before confirming.'
}

export async function POST(req: Request): Promise<Response> {
  try {
    const body = await req.json()
    const parsed = photoScreenSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { image, mediaType } = parsed.data
    const apiKey = process.env.ANTHROPIC_API_KEY

    let screening: ScreeningResponse

    if (!apiKey) {
      screening = {
        grade: 'B',
        approved: true,
        flags: [],
        surcharge_suggested: false,
        surcharge_amount: 0,
        admin_note: 'Dev mode — no Anthropic key configured',
        customer_message: getDefaultMessage('B'),
      }
    } else {
      const anthropic = new Anthropic({ apiKey })

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 512,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: image,
                },
              },
              {
                type: 'text',
                text: `You are screening a pre-booking photo of a residential underground storm shelter for Storm Sweep in Norman, OK.

Grade the shelter condition for service readiness:
- A/B: Clean enough to service, no major junk or hazards
- C: Moderate clutter — admin should review before confirming
- D/F: Excessive junk, standing water, or structural concerns — admin must call customer

Respond with JSON only:
{
  "grade": "A"|"B"|"C"|"D"|"F",
  "approved": boolean,
  "flags": string[],
  "surcharge_suggested": boolean,
  "surcharge_amount": number,
  "admin_note": string,
  "customer_message": string
}

customer_message rules:
- A/B: "Looks great! Your booking is confirmed."
- C: "We'll review this and confirm within 2 hours."
- D/F: "Our team will contact you shortly to discuss before confirming."`,
              },
            ],
          },
        ],
      })

      const textBlock = response.content.find((block) => block.type === 'text')
      if (!textBlock || textBlock.type !== 'text') {
        throw new Error('No response from vision model')
      }

      const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('Invalid JSON from vision model')
      }

      const rawJson = JSON.parse(jsonMatch[0]) as unknown
      const validated = screeningResponseSchema.safeParse(rawJson)

      if (!validated.success) {
        throw new Error('Vision model returned invalid schema')
      }

      screening = validated.data
    }

    return Response.json({
      data: {
        grade: screening.grade,
        approved: screening.approved,
        flags: screening.flags,
        customer_message: screening.customer_message || getDefaultMessage(screening.grade),
      },
    })
  } catch (error) {
    console.error('[photo-screen]', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
