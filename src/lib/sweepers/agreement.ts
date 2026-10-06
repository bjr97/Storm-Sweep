import { formatCurrency, PRICING } from '@/lib/utils'

/**
 * Storm Sweep Independent Contractor Agreement — signed in-app at
 * /sweepers/apply/agreement and rendered into a PDF on signing.
 *
 * DRAFT generated from SPEC.md / master plan. Must be reviewed by an
 * Oklahoma attorney before real Sweepers sign. When the text changes, bump
 * AGREEMENT_VERSION — each signed PDF records the version and a SHA-256 hash
 * of the exact text that was signed.
 *
 * Pay figures are read from PRICING so the agreement can never disagree with
 * what the app actually pays.
 */
export const AGREEMENT_VERSION = '2026-10-06 draft 1'

export const AGREEMENT_TITLE = 'Storm Sweep Independent Contractor Agreement'

export type AgreementSection = { heading: string; paragraphs: string[] }

const pct = (n: number): string => `${Math.round(n * 100)}%`
const s = PRICING.sweeper

export const AGREEMENT_SECTIONS: AgreementSection[] = [
  {
    heading: '1. Parties and purpose',
    paragraphs: [
      'This Agreement is between Storm Sweep ("Storm Sweep," "we," "us"), a residential storm shelter cleaning and upgrade service based in Norman, Oklahoma, and the individual signing below ("Sweeper," "you").',
      'Storm Sweep connects homeowners with independent Sweepers who clean, inspect, light, and stock underground storm shelters. This Agreement sets the terms under which you may accept and perform jobs offered through the Storm Sweep platform.',
    ],
  },
  {
    heading: '2. Independent contractor relationship',
    paragraphs: [
      'You are an independent contractor, not an employee, partner, or agent of Storm Sweep. You decide whether and when to accept jobs, and you control the manner of performing the work consistent with the quality and safety standards in this Agreement.',
      'You are not entitled to employee benefits, workers’ compensation coverage through Storm Sweep, or unemployment benefits based on this Agreement. You may perform services for others, including competitors, provided you comply with Sections 10 and 11.',
    ],
  },
  {
    heading: '3. Services and standards',
    paragraphs: [
      'For each job you accept, you agree to perform the services booked by the customer (such as deep cleaning, inspection, and any purchased upgrades) and to follow Storm Sweep’s field protocols, including completing the in-app checklist, uploading at least two before photos and two after photos, and obtaining the customer’s digital signature before marking a job complete.',
      'You will arrive within the scheduled window, communicate with customers only through the Storm Sweep app or automated messages, and leave the property clean.',
    ],
  },
  {
    heading: '4. Accepting jobs',
    paragraphs: [
      'There is no minimum number of jobs or hours. Once you accept a job, you are expected to complete it as scheduled. If you cannot, notify Storm Sweep as early as possible so the job can be reassigned.',
    ],
  },
  {
    heading: '5. Compensation',
    paragraphs: [
      `Base pay is a percentage of the job’s service value, determined by how quickly you accept the job after it is offered: ${pct(s.accept_1hr_pct)} if accepted within 1 hour, ${pct(s.accept_4hr_pct)} within 4 hours, ${pct(s.accept_24hr_pct)} within 24 hours, and ${pct(s.base_pct)} after 24 hours.`,
      `Additional amounts per completed job: turnaround bonuses of ${formatCurrency(s.turnaround_same_day)} (same day), ${formatCurrency(s.turnaround_day_1)} (next day), ${formatCurrency(s.turnaround_day_2)} (day 2), or ${formatCurrency(s.turnaround_day_3)} (day 3); ${formatCurrency(s.upgrade_commission)} for each upgrade you sell and complete on site; and ${formatCurrency(s.video_bonus)} when you upload both a before and an after video.`,
      'For Storm Ready membership visits, pay is calculated on the standard list price of the services performed. Pay is earned when a job is completed in accordance with Section 3. Storm Sweep may change the pay schedule for future jobs with at least 14 days’ written notice; changes never apply to jobs already accepted.',
    ],
  },
  {
    heading: '6. Taxes',
    paragraphs: [
      'Storm Sweep will not withhold income, Social Security, or Medicare taxes from your pay. You are responsible for reporting your income and paying all taxes owed, including self-employment tax and estimated quarterly payments.',
      'If you earn $600 or more in a calendar year, Storm Sweep will issue you a Form 1099-NEC by January 31 of the following year. You agree to provide a completed IRS Form W-9 before your first payout.',
    ],
  },
  {
    heading: '7. Equipment, vehicle, and insurance',
    paragraphs: [
      'You will supply and maintain your own equipment, including at minimum the tools verified during your application (wet/dry shop vacuum, stiff scrub brushes, mop and bucket, 25 ft+ extension cord, outdoor blower, headlamp, and N95 mask with gloves). Damaged or missing equipment is your responsibility to replace.',
      'You will use your own reliable vehicle and maintain valid driver’s license and auto insurance as required by Oklahoma law, and provide proof on request.',
    ],
  },
  {
    heading: '8. Safety and hazard protocol',
    paragraphs: [
      'If you find standing water, structural damage, mold beyond the surface, pest infestation, or hazardous materials, stop work immediately, photograph the condition, and contact Storm Sweep before continuing. Do not attempt structural repairs.',
      'Storm Sweep is a cleaning and upgrade service, not a junk removal service. Do not remove large items or discard customer belongings without Storm Sweep’s approval and the customer’s permission.',
    ],
  },
  {
    heading: '9. Conduct on customer property',
    paragraphs: [
      'No smoking, vaping, alcohol, or drugs on any job site. Enter only the areas of the property needed for the job, treat customers and their homes with respect, and keep noise to a minimum.',
    ],
  },
  {
    heading: '10. Confidentiality and privacy',
    paragraphs: [
      'Customer names, addresses, contact details, photos, and property information are confidential. Use them only to perform Storm Sweep jobs, and never share or post them, including on personal social media.',
    ],
  },
  {
    heading: '11. Non-solicitation',
    paragraphs: [
      'During this Agreement and for 12 months after it ends, you will not solicit or accept shelter cleaning or upgrade work directly from any customer you were introduced to through Storm Sweep, and you will not give customers your personal contact information for that purpose.',
    ],
  },
  {
    heading: '12. Photos, video, and content',
    paragraphs: [
      'Photos and videos you capture on Storm Sweep jobs are owned by Storm Sweep. Storm Sweep may use them for service reports and, only where the customer has opted in to marketing use, for marketing. Customer names, addresses, and identifying details are never published.',
    ],
  },
  {
    heading: '13. Term and termination',
    paragraphs: [
      'Either party may end this Agreement at any time with written notice (including email or text). Storm Sweep may end it immediately for theft, falsifying job records, safety violations, off-platform solicitation, or misconduct. You will be paid for jobs completed in accordance with this Agreement before termination.',
    ],
  },
  {
    heading: '14. Responsibility for your work',
    paragraphs: [
      'You are responsible for performing the work with reasonable care. You agree to promptly report any damage, injury, or incident that occurs on a job.',
    ],
  },
  {
    heading: '15. General terms',
    paragraphs: [
      'This Agreement is governed by the laws of the State of Oklahoma. It is the entire agreement between the parties on this subject and replaces any earlier understanding. If any part is found unenforceable, the rest remains in effect.',
      'You agree that signing electronically by typing your full legal name and checking the agreement box has the same effect as a handwritten signature, and that Storm Sweep may keep this Agreement as an electronic record.',
    ],
  },
]

/** Exact signed text — hashed into each signed PDF for integrity. */
export function agreementPlainText(): string {
  return [
    AGREEMENT_TITLE,
    `Version ${AGREEMENT_VERSION}`,
    ...AGREEMENT_SECTIONS.flatMap((sec) => [sec.heading, ...sec.paragraphs]),
  ].join('\n\n')
}

/** Names match if equal ignoring case, accents spacing and punctuation. */
export function namesMatch(typed: string, onFile: string): boolean {
  const norm = (v: string): string =>
    v
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z]/g, '')
  return norm(typed).length > 1 && norm(typed) === norm(onFile)
}
