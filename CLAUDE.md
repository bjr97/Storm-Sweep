# CLAUDE.md — Storm Sweep Project Rules
# Claude Code reads this file at the start of every session.
# ================================================================

## WHAT THIS PROJECT IS

Storm Sweep is a residential underground storm shelter cleaning and upgrade 
service in Norman, Oklahoma. This is a Next.js 14 (App Router) full-stack 
application with three user-facing portals: customer, sweeper (field worker), 
and admin (owner/management).

Full specification: see SPEC.md in the project root.
Planning documents: see /planning-docs/*.html (open in browser)

---

## TECH STACK — ALWAYS USE THESE

- **Framework:** Next.js 14 App Router (never Pages Router)
- **Language:** TypeScript strict mode
- **Styling:** Tailwind CSS + shadcn/ui (never inline styles, never CSS modules)
- **Database:** Supabase (PostgreSQL + Auth + Storage + Realtime)
- **ORM:** Supabase JS client directly (no Prisma, no Drizzle)
- **Auth:** Supabase Auth (never NextAuth, never Clerk)
- **Payments:** Stripe (subscriptions + one-time) + PayPal SDK
- **SMS:** Twilio
- **Email:** Resend + React Email
- **AI:** Anthropic SDK (claude-sonnet-4-5 for vision screening)
- **Forms:** React Hook Form + Zod validation
- **Icons:** Lucide React (never heroicons, never fontawesome)
- **Charts:** Recharts (admin dashboard only)

---

## CODE CONVENTIONS

### File & Folder Naming
- Components: PascalCase — `BookingForm.tsx`, `JobCard.tsx`
- Pages: lowercase — `page.tsx` (Next.js convention)
- API routes: lowercase — `route.ts` (Next.js convention)
- Utilities: camelCase — `formatCurrency.ts`
- Types: PascalCase — `Job`, `Profile`, `SweepersApplicant`

### TypeScript
- Always define explicit return types on functions
- Use Supabase generated types from `src/types/database.ts`
- Never use `any` — use `unknown` and narrow
- Use Zod schemas for all form validation and API input validation

### Money
- ALL money is integer **cents**: `PRICING`, DB columns, booking totals, API payloads
- Display with `formatCurrency(cents)` → "$149" / "$80.10"; PayPal needs `centsToDollarString()`; Stripe takes cents directly
- Apply percentages (deposit, member discount) then round to a whole cent; deposit = `calculateDeposit(total)`, balance = total − deposit
- Prep kit prices/catalog: `PRICING.kits` + `PREP_KIT_BUNDLES` / `PREP_KIT_ITEMS`; kit math via `priceKitSelection()` in `src/lib/booking/prepKits.ts`

### Components
- Use Server Components by default
- Add `'use client'` only when needed (event handlers, hooks, browser APIs)
- Keep client components small — push data fetching to server
- Use shadcn/ui components as the base — customize with Tailwind classes
- Never install additional UI libraries without asking

### Supabase Patterns
```typescript
// Server component — use server client
import { createClient } from '@/lib/supabase/server'
const supabase = createClient()

// Client component — use browser client  
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()

// API routes — use service role for admin operations
import { createServiceClient } from '@/lib/supabase/server'
const supabase = createServiceClient() // bypasses RLS
```

### API Routes
- Always validate input with Zod before processing
- Always check auth at the top of protected routes
- Return consistent error shapes: `{ error: string, code?: string }`
- Return consistent success shapes: `{ data: T, message?: string }`
- Use try/catch on all external API calls (Stripe, Twilio, Anthropic)

### Error Handling
```typescript
// Standard API route pattern
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: 'Invalid input', details: parsed.error }, { status: 400 })
    }
    // ... logic
    return Response.json({ data: result })
  } catch (error) {
    console.error('[route-name]', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

---

## ROLES & PERMISSIONS — CRITICAL

Three roles: `customer`, `sweeper`, `admin`

**Never skip role checks.** Every protected route must verify:
1. User is authenticated (middleware handles redirect to /login)
2. User has correct role for the route (middleware enforces)
3. Data access is filtered by RLS policies in Supabase

```typescript
// middleware.ts pattern — protect by path prefix
const roleRoutes = {
  '/admin': 'admin',
  '/sweeper': 'sweeper', 
  '/dashboard': 'customer',
  '/history': 'customer',
  '/photos': 'customer',
  '/membership': 'customer',
}
```

---

## BRAND & DESIGN — ALWAYS FOLLOW

### Colors (use Tailwind classes)
- Primary actions: `bg-sky` (#2E86C1) — book now, CTAs
- Premium/membership: `bg-wheat` (#D4A843) — Storm Ready
- NEVER write `bg-sky-DEFAULT` / `text-wheat-DEFAULT`: Tailwind does not
  generate `-DEFAULT` classes, so they silently do nothing (this made the
  Create Account button invisible until hover). The DEFAULT shade is `bg-sky`.
- Danger/urgency: `bg-tornado` (#C0392B) — alerts, warnings
- Dark backgrounds (admin/sweeper): `bg-shelter` (#141416)
- Light backgrounds (public/customer): `bg-white` or `bg-[#F7F7F4]`

### Typography classes
```
Font display/headlines: font-['Bebas_Neue'] tracking-wide
Font UI: font-['Barlow_Condensed'] or font-['Barlow']
```

### Design references (open in browser to see exact designs)
- Public website: `planning-docs/website-dark.html`
- Customer portal: no design doc yet — follow website-dark.html styling in the light theme
- Sweeper app: no design doc yet — follow super-admin-dash.html styling, mobile-first
- Admin dashboard: `planning-docs/super-admin-dash.html`

### Theme rules
- Admin + Sweeper portals: DARK theme (charcoal/slate backgrounds)
- Public website + Customer portal: LIGHT theme (cream/white backgrounds)
- Mobile-first for sweeper app (field workers use phones)
- Desktop-first for admin dashboard (managed from computer)

### Booking flow UI — MANDATORY consistency
The booking flow at `/book` has 6 steps:
1. Service Selection · 2. Prep Kit (KitSelector) · 3. Customer Details ·
4. Shelter Photo (AI screening) · 5. Payment · 6. Confirmation

ALL steps MUST use the shared `<BookingFooter>` component. Never build a
per-step footer or place nav buttons anywhere else. The footer is:
- Price summary bar on top: running total + itemized line breakdown of all
  current selections, updating reactively from booking state (never hardcoded)
- Nav row below: text-only "← Back" left (hidden on Step 1), prominent
  primary "Continue" right
- Continue button visible BY DEFAULT in both themes (a prior bug made it
  invisible until hover — never reintroduce this). Dark: bg-[#2E86C1] white
  text, hover bg-[#5DADE2]. Retro: match existing retro primary button.
- Positioning matches Step 1 (keep its sticky/static behavior)

Customer Details (Step 3) specifics:
- First Name and Last Name are SEPARATE fields (never a single full-name field)
- Address field uses Google Places autocomplete (Norman OK biased), with
  graceful fallback to plain text if the Places API is unavailable

---

## BUSINESS LOGIC — CRITICAL RULES

1. **Job completion requires:**
   - Minimum 2 before photos + 2 after photos uploaded
   - All `required: true` checklist items checked
   - Customer digital signature captured
   - Sweeper must be on-site (status must be 'in_progress')
   - Enforced in `completionBlockers()` (`src/lib/sweepers/jobRun.ts`); all Sweeper
     actions go through `POST /api/jobs/[id]/run` (service role, ownership checked).
   - Arrival is GPS-checked against the address (free US Census geocoder),
     300 m radius; no location = allowed but flagged `arrival_verified=false`.
   - Hazard report (`job_issues`) pauses the job until an admin picks
     "continue" or "end visit" (end visit = cancelled; refunds are manual).
   - On-site upgrade sales need customer initials on the Sweeper's phone;
     they add to `total_amount` (customer) and `service_value` (list price).
   - Media uploads use one-time signed upload URLs; never public bucket reads.

2. **Photo consent:**
   - Account-wide opt-in: `profiles.marketing_photo_consent` (Account page),
     mirrored onto `job_photos.customer_consent` for before/after photos.
   - Customers can reschedule/cancel online until 48h before (`src/lib/customer`);
     cancel with a paid deposit sets `jobs.refund_due` for the admin.
   - Service documentation: auto-opted-in (disclosed in T&Cs)
   - Marketing use: ON by default for new accounts (owner decision 2026-10-08),
     shown as a PRE-CHECKED box at sign-up (RegisterForm) and booking Step 3;
     unticking always opts out, ticking never overrides an earlier opt-out.
     Posts never show name or street address.
   - Never publish content without `photo_consent: true` on job_photos record

3. **Junk policy:**
   - If AI photo grade is C: admin reviews before confirming
   - If AI photo grade is D/F: booking paused, admin calls customer
   - Sweeper never removes large items without admin approval

4. **Payment flow:**
   - Prices are computed ONLY by `priceBooking()` (`src/lib/booking/quote.ts`).
     Checkout routes re-run it server-side via `repriceBooking()` from the
     booking's `selection`; client-sent amounts are ignored (mismatch = 409
     PRICE_CHANGED). Existing-member pricing requires being signed in as them.
   - `/api/bookings` (no payment) accepts only X-Large quotes and $0 included
     member visits.
   - Always use Stripe for memberships (subscriptions)
   - PayPal available for one-time payments only
   - Deposit = 50% at booking, balance charged after job complete
   - Never store card numbers — Stripe handles everything

5. **Sweeper pay calculation:**
   ```
   Accept < 1hr:  68% of job revenue
   Accept < 4hr:  64% of job revenue  
   Accept < 24hr: 62% of job revenue
   Accept > 24hr: 60% of job revenue
   + Turnaround same day: +$25
   + Turnaround day 1:   +$20
   + Turnaround day 2:   +$10
   + Turnaround day 3:   +$5
   + Per upgrade sold:   +$15
   + Video bonus:        +$10 (both before + after videos uploaded)
   ```
   - Rules + math live in `src/lib/sweepers/jobBoard.ts` (pure) and
     `src/lib/sweepers/board.ts` (server). Never re-derive them elsewhere.
   - **Job board:** confirmed + unassigned jobs go on the board
     (`board_opened_at`, set by a DB trigger; reset when a Sweeper drops).
     Tiers see a job Gold → Silver → Standard, 30 min apart; empty tiers skipped.
   - **Speed % clock starts when the job became visible to the claimer's tier**
     (`claim_visible_at`), not at booking. Admin assignments pay the base 60%.
   - **Turnaround bonus = completed (report submitted) on the scheduled day**;
     1/2/3 days late = $20/$10/$5. Customers pick the date, so never measure
     from booking.
   - Tier score: rating 40% + on-time 40% + reliability 20% (late drops in 90d).
     Gold 5+ jobs & 85+, Silver 2+ jobs & 70+. Admin can pin a tier.
   - Max 5 jobs per Sweeper per day. Dropping < 24h before = late drop.
   - Open jobs show city + ZIP only until claimed.

9. **Add-ons** (`src/lib/booking/addons.ts`, prices in `PRICING.addons`):
   LED $89, Interior Handle $45, Hinge / Roller Service $35, Shelter Carpet
   by size $99/$129/$159 (X-Large quoted). Count as upgrades (10% member
   discount, $15 Sweeper commission when sold on site).

10. **Arrival windows** (`src/lib/booking/timeWindows.ts`): Morning 8–11,
    Midday 11–2, Afternoon 2–5, Evening 5–8, Flexible. Required at booking;
    `scheduled_at` = window start (Chicago), `time_window` stores the choice.

6. **IC Tax:** Sweepers are 1099 contractors. Never withhold taxes. 
   Generate 1099-NEC for earners over $600/yr by Jan 31.
   Payouts (`src/lib/sweepers/payouts.ts`, /admin/payouts) record money sent
   and snapshot each job's pay (`jobs.payout_amount`); 1099 totals = payouts by
   `paid_at` in the calendar year (CSV export). The app never stores tax IDs.

7. **Partner referrals:** When `?ref=CODE` param present at booking,
   look up partner by referral_code, set partner_id on job record.
   Codes are stored uppercase and matched case-insensitively. A referral is
   earned when the referred job is COMPLETED; owed = completed x
   payout_per_referral - total_paid_out (computed, see `src/lib/admin/partners.ts`).

7b. **Customer referrals** (`src/lib/customer/referrals.ts`): share link
   `/book?invite=CODE` (separate from partner `?ref=`). First-time customers
   only, never own code: $25 off (`PRICING.referral.customer_credit`). The
   inviter gets $25 credit when the friend's visit COMPLETES (once,
   `referral_rewarded_at`); credit auto-applies to their next booking, is
   spent when paid, refunded on cancel. All verified in `repriceBooking()`.

7c. **Promo codes** (`promo_codes`, `src/lib/promos.ts`, admin on /admin/marketing):
   $ or % off the visit total, applied in `priceBooking()` BEFORE referral credit,
   never below `PROMO_MIN_TOTAL` ($1 — online checkout can't charge $0). One
   discount per booking: never combined with a friend invite. Expiry, use limit
   (non-cancelled jobs count) and first-time-only are re-checked in
   `repriceBooking()`; jobs store `promo_code_id` + `promo_discount`.

8. **Membership visits:** Storm Ready = 2 cleanings/yr INCLUDED in the fee.
   The visit booked at signup is #1 (clean = $0; covers up to standard size,
   large pays the $30 difference). Track `visits_used` on profiles.
   Members get 10% off upgrades (LED, Full Package upgrades, prep kits).
   The membership is billed ONLY as the Stripe subscription — never add it to
   the booking total or the 50% deposit (that double-charged members before).
   Monthly = 12-month commitment (`membership_commitment_ends_at`); never
   advertise "cancel anytime" for monthly.
   Sweeper pay on member visits uses `jobs.service_value` (list price), not
   `total_amount` (what the customer paid).

---

## TEXTING (SMS) COMPLIANCE

- All texts go through `sendSms()` (`src/lib/twilio.ts`): it converts numbers to
  E.164 and SKIPS anyone with `profiles.sms_opt_out` (returns `skipped`). Never
  call Twilio directly.
- Replies arrive at `POST /api/sms/inbound` (Twilio "A message comes in"
  webhook, signature-checked): STOP/START set the opt-out, RESCHEDULE gets the
  portal link, everything is logged in `sms_inbound` and forwarded to
  `ADMIN_PHONE_NUMBER`. Marketing texts must say "Reply STOP to opt out".
- Tornado-season campaign: daily automation, Feb 15–Mar 31, once/year/customer.

## ADMIN "VIEW AS" + DEMO ACCOUNTS

- `/admin/view-as`: the admin signs THIS browser in as a customer/Sweeper
  (`/api/admin/view-as`, one-time server-side magic link; the admin session is
  kept in httpOnly `ss_admin_return`; "Back to admin" = `/api/admin/view-as/exit`).
  Banner via `<PreviewBanner>` in the customer + Sweeper layouts.
- Real accounts are READ-ONLY: middleware 403s every non-GET (`PREVIEW_READ_ONLY`)
  while `ss_view_as` says non-demo. Browser-direct auth calls (sign out, password)
  must check `currentPreview()` (`src/lib/previewClient.ts`) — sign-out exits the
  preview instead of signing the person out.
- Demo accounts (`profiles.is_demo` / `jobs.is_demo`, seeded by `src/lib/demoSeed.ts`,
  emails @example.com) are fully usable but EXCLUDED from every admin report/list,
  revenue, payouts/1099, automation, and the real job board (demo Sweepers see
  only demo jobs; no tier delay). Never texted/emailed. New admin queries over
  jobs/people must add `.eq('is_demo', false)`.

## LIVE UPDATES + SERVICE AREA

- Live: a DB trigger (migration 021) pings the private Realtime topic
  `jobs-changes` (empty payload) on every jobs change; `<LiveRefresh>` (admin,
  Sweeper, customer layouts) calls router.refresh(), debounced, with a 60s poll
  fallback. Pages re-fetch their own data — never put job data in the ping.
- Service area: `service_zips` (empty = everywhere). `repriceBooking()` rejects
  out-of-area ZIPs (409 OUT_OF_AREA); Step 3 offers the `waitlist` instead.
  Admin phone bookings are not limited. Admin: /admin/service-area.

## TESTS

- `npm test` (node:test + tsx, `tests/*.test.ts`) locks in pricing, Sweeper pay,
  completion rules, time windows (incl. DST) and SMS helpers. CI runs it with
  tsc + lint on every push (`.github/workflows/ci.yml`). Add a test when you
  change money math.
- Business-local times: use `localDateTime()` — never "midnight + N hours".

## WHAT NOT TO DO

- **Never** use Pages Router (`/pages` directory)
- **Never** use `getServerSideProps` or `getStaticProps`
- **Never** install Prisma, Drizzle, or any other ORM
- **Never** install NextAuth or Clerk
- **Never** use inline styles (`style={{}}`)
- **Never** use CSS modules
- **Never** hardcode prices — always use `PRICING` constants from `src/lib/utils.ts`
- **Never** skip input validation on API routes
- **Never** use service role key in client-side code
- **Never** expose `SUPABASE_SERVICE_ROLE_KEY` to the browser
- **Never** create a server Supabase client without `noStoreFetch` (`src/lib/supabase/server.ts`): Next caches fetch() and served stale rows (a turned-off promo code still validated)
- **Never** publish social content without verifying `photo_consent: true`
- **Never** make Anthropic API calls from client components — server/API only
- **Never** give a booking step its own footer/nav — always use `<BookingFooter>`
- **Never** ship a Continue button that's invisible until hover — must be visible by default in both themes
- **Never** use a single combined "Full Name" field in booking — first + last are separate

---

## CURSOR PROMPT TEMPLATES

Use these as starting prompts in Cursor Composer for each major feature:

### Prompt 1 — Scaffold a new page
```
Build a Next.js 14 App Router [server/client] component at [path].
Use the Supabase server client to fetch [data].
The [entity] has these fields: [list from SPEC.md schema].
Style with Tailwind CSS using the Storm Sweep design system:
- Dark theme background: bg-[#141416] (admin/sweeper)
- Light theme background: bg-[#F7F7F4] (customer/public)
- Primary color: bg-[#2E86C1] text-white
- Font: Bebas Neue for headings, Barlow for body
Match the design reference at planning-docs/[relevant-file].html.
Use shadcn/ui components where appropriate.
Include TypeScript types from src/types/database.ts.
```

### Prompt 2 — API route
```
Build a Next.js App Router API route at [path].
[POST/GET/PATCH] method.
Auth: [public/customer/sweeper/admin — check role from Supabase session].
Input validation: Zod schema for { [fields] }.
Logic: [describe what it should do].
External services: [Stripe/Twilio/Anthropic/etc].
On success: [return shape].
On error: return { error: string } with appropriate status code.
Log errors to console with route name prefix.
Update Supabase table [table] with [fields].
```

### Prompt 3 — Supabase migration
```
Write a Supabase SQL migration for [feature].
Table name: [name].
Columns: [list with types].
Foreign keys: [references].
RLS policies: [who can select/insert/update/delete].
Use gen_random_uuid() for primary keys.
Include timestamptz default now() for created_at.
```

### Prompt 4 — Form with validation
```
Build a React Hook Form + Zod form component for [purpose].
Fields: [list field names, types, validation rules].
On submit: call [API route or server action].
Show field-level validation errors inline.
Loading state on submit button.
Success: [redirect or show message].
Error: show toast notification using shadcn/ui toast.
Style with Tailwind — [light/dark] theme.
```

### Prompt 5 — Twilio SMS trigger
```
Add a new SMS trigger type '[trigger_name]' to src/lib/twilio.ts.
Template: [write the message template with variables].
Variables: [list].
Call it from [route or event].
Log to sms_log table: { profile_id, job_id (if applicable), trigger, body, twilio_sid }.
```

### Prompt 6 — Stripe webhook handler
```
Add handling for Stripe event '[event.type]' in /api/stripe/webhook/route.ts.
When this event fires: [describe what should happen].
Update Supabase table [table]: set [fields] where [condition].
Trigger SMS: [trigger_name] if applicable.
Verify webhook signature using STRIPE_WEBHOOK_SECRET.
```

### Prompt 7 — Realtime subscription
```
Add a Supabase Realtime subscription to the [component] component.
Listen to changes on table [table] where [filter condition].
On INSERT: [what to do].
On UPDATE: [what to do].
Update local state with the new data.
Clean up subscription on component unmount.
```

---

## PHASE STATUS

Track progress here as phases complete:

- [ ] Phase 1.1 — Project initialization
- [ ] Phase 1.2 — Auth & middleware
- [ ] Phase 1.3 — Public website
- [ ] Phase 1.4 — Booking flow
- [ ] Phase 1.5 — Sweeper onboarding portal
- [ ] Phase 1.6 — AI photo screening API
- [ ] Phase 1.7 — SMS automation (Twilio)
- [ ] Phase 1.8 — Email (Resend)
- [x] Phase 2.1 — Sweeper dashboard (job board)
- [x] Phase 2.2 — Job detail + checklist
- [x] Phase 2.3 — Sweeper schedule
- [x] Phase 2.4 — Sweeper earnings (+ YTD/1099 on admin Crew)
- [x] Phase 2.5 — Admin dashboard
- [x] Phase 2.6 — Admin schedule
- [x] Phase 2.7 — Admin job management
- [x] Phase 3.1 — Customer dashboard
- [x] Phase 3.2 — Job history (+ /history/[id] service report)
- [x] Phase 3.3 — Photos gallery
- [ ] Phase 3.4 — Membership + Stripe subscriptions (portal view + member booking done; Stripe billing pending)
- [x] Phase 3.5 — Account settings
- [x] Phase 4.1 — Revenue charts (/admin/revenue)
- [x] Phase 4.2 — Partners management (/admin/partners)
- [ ] Phase 4.3 — Supabase Realtime
- [ ] Phase 4.4 — Google Maps routes
- [x] Phase 4.5 — Referral program (customer "Give $25, get $25")
- [x] Phase 4.6 — Review system (/admin/reviews)
- [ ] Phase 4.7 — TikTok integration
- [x] Phase 4.8 — PWA sweeper app (manifest, icons, offline page)
- [x] Phase 4.9 — Tornado season automation (daily, Feb 15–Mar 31)

---

*Storm Sweep · Norman, OK · stormsweep.com*
*CLAUDE.md v1.0 — Update this file as conventions evolve*
