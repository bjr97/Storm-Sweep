import { JOB_BOARD } from '@/lib/sweepers/jobBoard'
import { formatCurrency, PRICING } from '@/lib/utils'

/**
 * Sweeper onboarding (pure — content + quiz grading, safe on client and server).
 * A Sweeper must read every module and pass the quiz before claiming jobs.
 * Optional videoUrl per module: paste a YouTube/Vimeo link to show a video.
 */

export type TrainingModule = {
  id: string
  title: string
  minutes: number
  videoUrl?: string
  points: string[]
}

const pct = (n: number): string => `${Math.round(n * 100)}%`

export const TRAINING_MODULES: TrainingModule[] = [
  {
    id: 'jobs',
    title: 'How jobs work',
    minutes: 3,
    points: [
      'Open jobs appear on the Jobs tab. Before you claim, you only see the city and ZIP; the full address unlocks once the job is yours.',
      'Gold Sweepers see new jobs first, then Silver, then Standard, about 30 minutes apart. Your tier comes from your rating, on-time record and reliability.',
      `Claim fast to earn more: ${pct(PRICING.sweeper.accept_1hr_pct)} of the job if you claim within an hour of it opening to you, down to ${pct(PRICING.sweeper.base_pct)} after a day.`,
      `Finish on the scheduled day for a turnaround bonus. Each upgrade you sell on site adds ${formatCurrency(PRICING.sweeper.upgrade_commission)}, and uploading both before and after videos adds ${formatCurrency(PRICING.sweeper.video_bonus)}.`,
      `You can take up to ${JOB_BOARD.MAX_JOBS_PER_DAY} jobs a day. Dropping a job less than 24 hours before it starts counts as a late drop and can lower your tier.`,
    ],
  },
  {
    id: 'visit',
    title: 'Running a visit in the app',
    minutes: 4,
    points: [
      'Tap "On my way" when you leave. The customer gets a text.',
      'Tap "Arrived — start job" at the house. The app checks your location against the address.',
      'Take at least 2 before photos before you start cleaning.',
      'Work through the checklist. Every required item must be checked.',
      'Take at least 2 after photos, then have the customer sign on your phone. The job can’t be completed without the photos and signature.',
      'If the customer wants an upgrade (LED, handle, hinge service, carpet), add it in the app and have them initial on your phone before you do the work.',
    ],
  },
  {
    id: 'safety',
    title: 'Safety first',
    minutes: 3,
    points: [
      'If you smell gas, leave the shelter right away, move everyone away, and call 911 from outside. Then report it in the app.',
      'For any hazard (standing water, electrical problems, structural damage, animals or anything that feels unsafe), stop and use "Pause job & alert office" in the app. The job stays paused until the office decides what to do.',
      'Never remove large items from a shelter without approval from the office.',
      'Wear gloves, a mask and eye protection when treating mold, and keep the hatch open for air while you work.',
    ],
  },
  {
    id: 'customers',
    title: 'Customers, photos and privacy',
    minutes: 2,
    points: [
      'Photos are of the shelter only: no people, faces, house numbers, license plates or mail.',
      'Never post job photos on your own social media. Storm Sweep shares photos only with the customer’s permission, and never their name or address.',
      'Keep customer details private. Don’t text or call customers from your personal number for anything except the visit.',
      'Be on time for the arrival window, be friendly, and leave the area cleaner than you found it.',
    ],
  },
  {
    id: 'pay',
    title: 'Getting paid',
    minutes: 2,
    points: [
      'You’re an independent contractor (1099). Storm Sweep doesn’t withhold taxes, so set some aside.',
      'Your Earnings tab shows every completed job and what you’re owed. Payouts are recorded when the office pays you.',
      'Send the office your W-9 before your first payout. Anyone paid $600 or more in a year gets a 1099-NEC by January 31.',
    ],
  },
]

export type QuizQuestion = { id: string; question: string; options: string[] }

const QUIZ: (QuizQuestion & { answer: number })[] = [
  {
    id: 'photos',
    question: 'How many before and after photos do you need to complete a job?',
    options: ['None, the checklist is enough', 'At least 1 of each', 'At least 2 before and 2 after', 'Only after photos'],
    answer: 2,
  },
  {
    id: 'gas',
    question: 'You smell gas when you open the shelter. What do you do?',
    options: ['Open the hatch and keep working', 'Leave right away, get everyone clear, call 911 from outside and report it', 'Finish quickly and mention it to the customer', 'Spray deodorizer and check again'],
    answer: 1,
  },
  {
    id: 'junk',
    question: 'The customer asks you to haul away an old couch stored in the shelter.',
    options: ['Take it, they asked', 'Only with approval from the office', 'Charge them cash on the spot', 'Leave it outside by the street'],
    answer: 1,
  },
  {
    id: 'upgrade',
    question: 'A customer wants LED lights added during the visit. When can you start?',
    options: ['Right away', 'After they initial the upgrade on your phone', 'After the office emails them', 'Next visit only'],
    answer: 1,
  },
  {
    id: 'drop',
    question: 'What happens if you drop a job less than 24 hours before it starts?',
    options: ['Nothing', 'It counts as a late drop and can lower your tier', 'You pay a fine', 'The customer is charged'],
    answer: 1,
  },
]

/** Questions without answers (safe to send to the browser). */
export const QUIZ_QUESTIONS: QuizQuestion[] = QUIZ.map((q) => ({ id: q.id, question: q.question, options: q.options }))

/** Grade answers (index per question, in order). Returns the ids answered wrong. */
export function gradeQuiz(answers: number[]): { passed: boolean; wrong: string[] } {
  const wrong = QUIZ.filter((q, i) => answers[i] !== q.answer).map((q) => q.id)
  return { passed: wrong.length === 0 && answers.length === QUIZ.length, wrong }
}

export type TrainingProgress = { read: string[] }

export function parseProgress(raw: unknown): TrainingProgress {
  const read = raw && typeof raw === 'object' && Array.isArray((raw as { read?: unknown }).read) ? (raw as { read: unknown[] }).read : []
  const valid = new Set(TRAINING_MODULES.map((m) => m.id))
  return { read: read.filter((x): x is string => typeof x === 'string' && valid.has(x)) }
}

export function allModulesRead(p: TrainingProgress): boolean {
  return TRAINING_MODULES.every((m) => p.read.includes(m.id))
}
