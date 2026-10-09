import { createServiceClient } from '@/lib/supabase/server'
import type { LaunchSection, LaunchTask } from '@/types/database'

/**
 * Launch checklist (/admin/launch), server-only. Manual to-dos live in
 * launch_tasks; automatic checks are computed from env vars + the database and
 * only ever report set / not set (never a key's value).
 */

export const LAUNCH_DATE = '2026-11-15'

export const LAUNCH_SECTIONS: { id: LaunchSection; title: string }[] = [
  { id: 'business', title: 'Business & legal' },
  { id: 'insurance', title: 'Insurance' },
  { id: 'brand', title: 'Brand & marketing' },
  { id: 'operations', title: 'Operations' },
  { id: 'website', title: 'Website setup' },
]

type Starter = { section: LaunchSection; title: string; notes?: string; link?: string }

/** Inserted once, on the first visit to the page. Edit or delete freely after. */
const STARTER_TASKS: Starter[] = [
  { section: 'business', title: 'Form the LLC', notes: 'Oklahoma Secretary of State (sos.ok.gov). Do this first: the EIN and bank account need it.' },
  { section: 'business', title: 'Get an EIN', notes: 'Free at irs.gov, takes minutes once the LLC exists.' },
  { section: 'business', title: 'Open a business bank account', notes: 'Bring the LLC paperwork and EIN.' },
  { section: 'business', title: 'Write an operating agreement' },
  { section: 'business', title: 'Set up bookkeeping', notes: 'Wave (free) or QuickBooks.' },
  { section: 'business', title: 'Find an accountant' },
  { section: 'business', title: 'Ask the accountant about sales tax on prep kits', notes: 'Kits are physical goods; ask whether you need an Oklahoma sales tax permit.' },
  { section: 'business', title: 'Check whether Norman requires a city license or permit' },
  { section: 'business', title: 'Lawyer review: Terms, Privacy, Sweeper contractor agreement', link: '/terms' },

  { section: 'insurance', title: 'General liability policy for Storm Sweep' },
  { section: 'insurance', title: 'Decide what Sweepers must carry', notes: 'Their own liability policy? Proof of auto insurance? The Crew page already tracks auto insurance expiry.', link: '/admin/crew' },
  { section: 'insurance', title: 'Ask your agent about damage to a customer’s shelter or property' },

  { section: 'brand', title: 'Google Business Profile', notes: 'The biggest one for “shelter cleaning near me” searches.' },
  { section: 'brand', title: 'Facebook page' },
  { section: 'brand', title: 'Instagram account' },
  { section: 'brand', title: 'TikTok account' },
  { section: 'brand', title: 'Nextdoor business page' },
  { section: 'brand', title: 'Business email on your domain', notes: 'e.g. hello@stormsweep.com. Then set NEXT_PUBLIC_SUPPORT_EMAIL in Vercel.' },
  { section: 'brand', title: 'Logo files for print and social' },
  { section: 'brand', title: 'Yard signs, door hangers, flyers, car magnets' },
  { section: 'brand', title: 'Create a launch promo code', link: '/admin/marketing' },

  { section: 'operations', title: 'Review the Sweeper training guide', notes: 'Use View as → Sweeper → Guide tab.', link: '/admin/view-as' },
  { section: 'operations', title: 'Review the Terms (4 open decisions)', notes: 'No rollover of unused member cleanings; report problems within 7 days; liability limited to redo/refund; refund if we reschedule and no new time works.', link: '/terms' },
  { section: 'operations', title: 'Review the Privacy Policy and FAQ', link: '/privacy' },
  { section: 'operations', title: 'Recruit the first Sweepers', notes: 'Share stormsweep.com/sweepers/apply.', link: '/admin/sweepers' },
  { section: 'operations', title: 'Collect W-9s and insurance from Sweepers', link: '/admin/crew' },
  { section: 'operations', title: 'Equipment and supply list for Sweepers' },
  { section: 'operations', title: 'Prep kit supplier and starting inventory' },
  { section: 'operations', title: 'Friends & family trial: 3–5 real visits' },

  { section: 'website', title: 'Register texting with carriers (Twilio A2P 10DLC)', notes: 'Start early: approval can take 1–3 weeks, even if texting is connected last.' },
  { section: 'website', title: 'Verify your domain in Resend', notes: 'SPF/DKIM records so emails don’t land in spam.' },
  { section: 'website', title: 'Connect stormsweep.com to Vercel' },
  { section: 'website', title: 'Rotate the Supabase secret key', notes: 'It was pasted into a chat earlier. Create a new one in Supabase, update Vercel and .env.local.' },
  { section: 'website', title: 'PayPal business account (switch to live mode)' },
  { section: 'website', title: 'Google Maps / Places API key with a spending limit' },
  { section: 'website', title: 'One real booking end to end on the live site' },
]

/** Insert the starter list once (a '_meta' row records that it happened). */
export async function ensureLaunchSeeded(): Promise<void> {
  const supabase = createServiceClient()
  const { data: meta, error } = await supabase.from('launch_tasks').select('id').eq('section', '_meta').limit(1)
  if (error) throw error
  if (meta.length > 0) return
  const rows = STARTER_TASKS.map((t, i) => ({ section: t.section, title: t.title, notes: t.notes ?? null, link: t.link ?? null, sort_order: i }))
  const { error: insErr } = await supabase.from('launch_tasks').insert([{ section: '_meta', title: 'seeded', sort_order: -1 }, ...rows])
  if (insErr) throw insErr
}

export async function listLaunchTasks(): Promise<LaunchTask[]> {
  const { data, error } = await createServiceClient().from('launch_tasks').select('*').neq('section', '_meta').order('sort_order').order('created_at')
  if (error) throw error
  return data
}

// ---- Automatic checks --------------------------------------------------------

export type AutoCheck = { id: string; label: string; status: 'ok' | 'missing' | 'warn' | 'later'; detail: string }

const has = (...names: string[]): boolean => names.every((n) => Boolean(process.env[n]?.trim()))

/** Tables/columns from every migration; a failed select means that SQL step hasn't run. */
const SCHEMA_PROBES: { table: string; columns: string }[] = [
  { table: 'jobs', columns: 'balance_paid_at, is_demo, promo_code_id' },
  { table: 'profiles', columns: 'w9_received_at, is_demo, training_completed_at' },
  { table: 'promo_codes', columns: 'id' },
  { table: 'service_zips', columns: 'zip' },
  { table: 'waitlist', columns: 'id' },
  { table: 'help_requests', columns: 'id' },
  { table: 'launch_tasks', columns: 'id' },
]

export async function getAutoChecks(): Promise<AutoCheck[]> {
  const supabase = createServiceClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() ?? ''
  const paypalMode = process.env.PAYPAL_MODE?.trim().toLowerCase()

  const [probes, zips, trained] = await Promise.all([
    Promise.all(SCHEMA_PROBES.map(async (p) => (await supabase.from(p.table as 'jobs').select(p.columns).limit(1)).error === null)),
    supabase.from('service_zips').select('zip', { count: 'exact', head: true }),
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'sweeper')
      .eq('is_demo', false)
      .or('training_completed_at.not.is.null,training_waived.eq.true'),
  ])
  const missingSchema = SCHEMA_PROBES.filter((_, i) => !probes[i]).map((p) => p.table)
  const ok = (cond: boolean, yes: string, no: string, missing: AutoCheck['status'] = 'missing'): Pick<AutoCheck, 'status' | 'detail'> =>
    cond ? { status: 'ok', detail: yes } : { status: missing, detail: no }

  return [
    { id: 'db', label: 'Database up to date', ...ok(missingSchema.length === 0, 'Every SQL step has run.', `Missing: ${missingSchema.join(', ')}. Ask Claude for the SQL.`) },
    { id: 'url', label: 'Site address', ...ok(/^https:\/\//.test(appUrl) && !appUrl.includes('localhost'), appUrl, 'Set NEXT_PUBLIC_APP_URL in Vercel to https://stormsweep.com (links in texts and emails use it).') },
    { id: 'twilio', label: 'Texting (Twilio)', ...ok(has('TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER'), 'Connected.', 'Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_PHONE_NUMBER in Vercel.') },
    { id: 'admin_phone', label: 'Your phone for office alerts', ...ok(has('ADMIN_PHONE_NUMBER'), 'Set.', 'Add ADMIN_PHONE_NUMBER in Vercel (where low ratings, help requests and replies are texted).') },
    { id: 'resend', label: 'Email (Resend)', ...ok(has('RESEND_API_KEY', 'RESEND_FROM_EMAIL'), 'Connected.', 'Add RESEND_API_KEY and RESEND_FROM_EMAIL in Vercel.') },
    { id: 'anthropic', label: 'AI shelter photo checks', ...ok(has('ANTHROPIC_API_KEY'), 'Connected.', 'Add ANTHROPIC_API_KEY in Vercel.') },
    {
      id: 'paypal',
      label: 'PayPal payments',
      ...(has('PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET', 'NEXT_PUBLIC_PAYPAL_CLIENT_ID')
        ? paypalMode === 'live'
          ? { status: 'ok' as const, detail: 'Connected in live mode.' }
          : { status: 'warn' as const, detail: 'Connected in test (sandbox) mode. Set PAYPAL_MODE=live to take real payments.' }
        : { status: 'missing' as const, detail: 'Add PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET and NEXT_PUBLIC_PAYPAL_CLIENT_ID in Vercel.' }),
    },
    { id: 'google', label: 'Address suggestions (Google)', ...ok(has('NEXT_PUBLIC_GOOGLE_MAPS_KEY'), 'Connected.', 'Add NEXT_PUBLIC_GOOGLE_MAPS_KEY in Vercel. Booking still works without it (plain address box).', 'warn') },
    { id: 'cron', label: 'Daily automation protected', ...ok(has('CRON_SECRET'), 'CRON_SECRET is set.', 'Add CRON_SECRET in Vercel so only Vercel can run the daily reminders.') },
    { id: 'support', label: 'Public support contact', ...ok(has('NEXT_PUBLIC_SUPPORT_EMAIL') || has('NEXT_PUBLIC_SUPPORT_PHONE'), 'Shown on FAQ, Terms and Help.', 'Optional: add NEXT_PUBLIC_SUPPORT_EMAIL and/or NEXT_PUBLIC_SUPPORT_PHONE in Vercel.', 'warn') },
    { id: 'area', label: 'Service area set', ...ok((zips.count ?? 0) > 0, `${zips.count} ZIP codes book online.`, 'No ZIPs listed, so every address can book. Add ZIPs on Service area.', 'warn') },
    { id: 'sweepers', label: 'Trained Sweepers', ...ok((trained.count ?? 0) > 0, `${trained.count} ready to claim jobs.`, 'No real Sweeper has finished training yet.') },
    { id: 'stripe', label: 'Stripe (memberships)', status: 'later', detail: 'On hold. Until then, members are signed up by the office.' },
  ]
}
