import { createHash } from 'node:crypto'

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'

import { formatBusinessDate } from '@/lib/admin/time'
import {
  AGREEMENT_SECTIONS,
  AGREEMENT_TITLE,
  AGREEMENT_VERSION,
  agreementPlainText,
} from '@/lib/sweepers/agreement'

export type SignatureRecord = {
  applicantId: string
  legalName: string
  email: string
  phone: string
  signedAt: Date
  ipAddress: string
  userAgent: string
}

const PAGE = { width: 612, height: 792, margin: 54 }
const INK = rgb(0.08, 0.08, 0.09)
const MUTED = rgb(0.38, 0.38, 0.4)

/** Standard PDF fonts only cover WinAnsi; replace anything else (emoji, CJK…). */
function safe(font: PDFFont, text: string): string {
  return Array.from(text)
    .map((ch) => {
      try {
        font.encodeText(ch)
        return ch
      } catch {
        return '?'
      }
    })
    .join('')
}

function wrap(font: PDFFont, text: string, size: number, maxWidth: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of safe(font, text).split(/\s+/)) {
    const next = line ? `${line} ${word}` : word
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      line = next
    } else {
      if (line) lines.push(line)
      line = word
    }
  }
  if (line) lines.push(line)
  return lines
}

export function agreementHash(): string {
  return createHash('sha256').update(agreementPlainText(), 'utf8').digest('hex')
}

/** Renders the agreement text plus an electronic-signature record. */
export async function buildSignedAgreementPdf(sig: SignatureRecord): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  pdf.setTitle(`${AGREEMENT_TITLE} — ${sig.legalName}`)
  pdf.setAuthor('Storm Sweep')
  pdf.setSubject(`Signed electronically, version ${AGREEMENT_VERSION}`)
  pdf.setCreationDate(sig.signedAt)

  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const width = PAGE.width - PAGE.margin * 2

  let page: PDFPage = pdf.addPage([PAGE.width, PAGE.height])
  let y = PAGE.height - PAGE.margin

  function ensure(space: number): void {
    if (y - space < PAGE.margin) {
      page = pdf.addPage([PAGE.width, PAGE.height])
      y = PAGE.height - PAGE.margin
    }
  }

  function text(value: string, opts: { size?: number; font?: PDFFont; color?: typeof INK; gap?: number } = {}): void {
    const size = opts.size ?? 10
    const font = opts.font ?? regular
    const lineHeight = size * 1.4
    for (const line of wrap(font, value, size, width)) {
      ensure(lineHeight)
      page.drawText(line, { x: PAGE.margin, y: y - size, size, font, color: opts.color ?? INK })
      y -= lineHeight
    }
    y -= opts.gap ?? 6
  }

  text(AGREEMENT_TITLE, { size: 16, font: bold, gap: 2 })
  text(`Version ${AGREEMENT_VERSION}`, { size: 9, color: MUTED, gap: 14 })

  for (const section of AGREEMENT_SECTIONS) {
    ensure(40)
    text(section.heading, { size: 11, font: bold, gap: 4 })
    for (const p of section.paragraphs) text(p, { gap: 6 })
    y -= 4
  }

  // ---- Signature record ----
  ensure(190)
  y -= 8
  page.drawLine({
    start: { x: PAGE.margin, y },
    end: { x: PAGE.width - PAGE.margin, y },
    thickness: 0.75,
    color: MUTED,
  })
  y -= 16
  text('Electronic signature', { size: 12, font: bold, gap: 8 })
  text(`Signed by: ${sig.legalName}`, { size: 14, font: bold, gap: 8 })
  const when = `${formatBusinessDate(sig.signedAt, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  })} (${sig.signedAt.toISOString()})`
  for (const line of [
    `Date and time: ${when}`,
    `Email: ${sig.email}`,
    `Phone: ${sig.phone}`,
    `Application ID: ${sig.applicantId}`,
    `IP address: ${sig.ipAddress}`,
    `Browser: ${sig.userAgent.slice(0, 180)}`,
    `Agreement version: ${AGREEMENT_VERSION}`,
    `Agreement text SHA-256: ${agreementHash()}`,
  ]) {
    text(line, { size: 9, color: MUTED, gap: 2 })
  }
  y -= 6
  text(
    'The signer confirmed they read this Agreement, checked "I agree," and typed their full legal name as their electronic signature, which they agreed has the same effect as a handwritten signature.',
    { size: 9, color: MUTED }
  )

  return pdf.save()
}
