import Anthropic from '@anthropic-ai/sdk'

export type PhotoGrade = 'A' | 'B' | 'C' | 'D' | 'F'

export type SupportedMediaType =
  | 'image/jpeg'
  | 'image/png'
  | 'image/gif'
  | 'image/webp'

export interface PhotoScreenResult {
  grade: PhotoGrade
  approved: boolean
  flags: string[]
  surcharge_suggested: boolean
  surcharge_amount: number
  admin_note: string
  customer_message: string
}

const GRADING_PROMPT = `You are an expert inspector for Storm Sweep, a residential underground storm shelter cleaning service in Norman, Oklahoma.

Evaluate the uploaded photo of a customer's in-ground garage storm shelter (interior or exterior hatch view).

Assess these four categories:
1. **Cleanliness** — floor/wall condition, mold/mildew, dust, stains, pest evidence
2. **Junk/debris level** — loose items, stored boxes, furniture, trash bags, hazardous clutter blocking service
3. **Structural issues** — cracks, rust, water intrusion, standing water, warped hatch, damaged hinges
4. **Accessibility** — can a technician enter and work safely? Is the hatch reachable? Is clutter blocking access?

Grade scale:
- **A** — Spotless or lightly dusty; minimal items; fully accessible; no structural concerns. Auto-approve booking.
- **B** — Moderate dust or minor clutter; still serviceable without surcharge; no major structural issues.
- **C** — Notable clutter, moderate mold, or minor structural wear. Admin must review before confirming. May suggest $25–$50 surcharge if extra debris removal needed.
- **D** — Heavy clutter, significant mold, standing water, or accessibility blocked. Booking paused — admin calls customer. Suggest $50–$100 surcharge if serviceable after cleanup discussion.
- **F** — Unsafe, flooded, collapsed, inaccessible, or extreme hoarding. Do not approve. Admin must contact customer immediately.

Business rules:
- Grade A or B → approved: true
- Grade C, D, or F → approved: false
- surcharge_suggested: true only when extra debris/junk removal beyond standard cleaning is likely ($25–$100 range)
- flags: short snake_case tags e.g. ["heavy_clutter","standing_water","mold_visible","access_blocked"]
- admin_note: 1–2 sentences for internal staff (plain, actionable)
- customer_message: friendly 1–2 sentences shown to the homeowner (no internal jargon)

Respond with ONLY valid JSON, no markdown:
{
  "grade": "A",
  "approved": true,
  "flags": [],
  "surcharge_suggested": false,
  "surcharge_amount": 0,
  "admin_note": "",
  "customer_message": ""
}`

function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured')
  }
  return new Anthropic({ apiKey })
}

function parseScreeningResponse(text: string): PhotoScreenResult {
  const trimmed = text.trim()
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('No JSON object found in model response')
  }

  const parsed = JSON.parse(jsonMatch[0]) as Partial<PhotoScreenResult>

  const grade = parsed.grade
  if (!grade || !['A', 'B', 'C', 'D', 'F'].includes(grade)) {
    throw new Error(`Invalid grade in model response: ${String(grade)}`)
  }

  const approved = grade === 'A' || grade === 'B'

  return {
    grade,
    approved,
    flags: Array.isArray(parsed.flags)
      ? parsed.flags.filter((f): f is string => typeof f === 'string')
      : [],
    surcharge_suggested: Boolean(parsed.surcharge_suggested),
    surcharge_amount:
      typeof parsed.surcharge_amount === 'number' ? parsed.surcharge_amount : 0,
    admin_note: typeof parsed.admin_note === 'string' ? parsed.admin_note : '',
    customer_message:
      typeof parsed.customer_message === 'string' ? parsed.customer_message : '',
  }
}

export async function screenShelterPhoto(
  imageBase64: string,
  mediaType: SupportedMediaType
): Promise<PhotoScreenResult> {
  const client = getAnthropicClient()

  const response = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: imageBase64,
            },
          },
          {
            type: 'text',
            text: GRADING_PROMPT,
          },
        ],
      },
    ],
  })

  const textBlock = response.content.find((block) => block.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text content in Anthropic response')
  }

  return parseScreeningResponse(textBlock.text)
}
