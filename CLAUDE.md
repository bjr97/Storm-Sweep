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
- Primary actions: `bg-sky-DEFAULT` (#2E86C1) — book now, CTAs
- Premium/membership: `bg-wheat-DEFAULT` (#D4A843) — Storm Ready
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
- Customer portal: `planning-docs/customer-portal.html`
- Sweeper app: `planning-docs/admin-app.html`
- Admin dashboard: `planning-docs/super-admin-dash.html`

### Theme rules
- Admin + Sweeper portals: DARK theme (charcoal/slate backgrounds)
- Public website + Customer portal: LIGHT theme (cream/white backgrounds)
- Mobile-first for sweeper app (field workers use phones)
- Desktop-first for admin dashboard (managed from computer)

---

## BUSINESS LOGIC — CRITICAL RULES

1. **Job completion requires:**
   - Minimum 2 before photos + 2 after photos uploaded
   - All `required: true` checklist items checked
   - Customer digital signature captured
   - Sweeper must be on-site (status must be 'in_progress')

2. **Photo consent:**
   - Service documentation: auto-opted-in (disclosed in T&Cs)
   - Marketing use: explicit opt-in ONLY — default is false
   - Never publish content without `photo_consent: true` on job_photos record

3. **Junk policy:**
   - If AI photo grade is C: admin reviews before confirming
   - If AI photo grade is D/F: booking paused, admin calls customer
   - Sweeper never removes large items without admin approval

4. **Payment flow:**
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

6. **IC Tax:** Sweepers are 1099 contractors. Never withhold taxes. 
   Generate 1099-NEC for earners over $600/yr by Jan 31.

7. **Partner referrals:** When `?ref=CODE` param present at booking,
   look up partner by referral_code, set partner_id on job record.

8. **Membership visits:** Storm Ready = 2 visits/yr. Track visits_used 
   on profiles. Members always get 10% off upgrades (apply at checkout).

---

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
- **Never** publish social content without verifying `photo_consent: true`
- **Never** make Anthropic API calls from client components — server/API only

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
- [ ] Phase 2.1 — Sweeper dashboard
- [ ] Phase 2.2 — Job detail + checklist
- [ ] Phase 2.3 — Sweeper schedule
- [ ] Phase 2.4 — Sweeper earnings
- [ ] Phase 2.5 — Admin dashboard
- [ ] Phase 2.6 — Admin schedule
- [ ] Phase 2.7 — Admin job management
- [ ] Phase 3.1 — Customer dashboard
- [ ] Phase 3.2 — Job history
- [ ] Phase 3.3 — Photos gallery
- [ ] Phase 3.4 — Membership + Stripe subscriptions
- [ ] Phase 3.5 — Account settings
- [ ] Phase 4.1 — Revenue charts
- [ ] Phase 4.2 — Partners management
- [ ] Phase 4.3 — Supabase Realtime
- [ ] Phase 4.4 — Google Maps routes
- [ ] Phase 4.5 — Referral program
- [ ] Phase 4.6 — Review system
- [ ] Phase 4.7 — TikTok integration
- [ ] Phase 4.8 — PWA sweeper app
- [ ] Phase 4.9 — Tornado season automation

---

*Storm Sweep · Norman, OK · stormsweep.com*
*CLAUDE.md v1.0 — Update this file as conventions evolve*
