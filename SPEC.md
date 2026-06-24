# STORM SWEEP — PROJECT SPECIFICATION
# Version: 1.0 | Last Updated: May 2026
# For use with: Claude Code + Cursor + Vercel + Supabase
# ================================================================

## PROJECT OVERVIEW

Storm Sweep is a residential underground storm shelter cleaning and upgrade 
service based in Norman, Oklahoma. The business connects homeowners with 
independent contractor "Sweepers" who clean, inspect, light, and stock 
in-ground garage storm shelters.

### Business Model
- One-time service visits ($129–$299+ depending on shelter size + services)
- Annual Storm Ready membership ($249/yr or $24/mo — customer chooses at checkout)
- Upgrade add-ons: LED lighting ($89), supply kits ($29–$149 in 5 tiers), 
  door/hardware upgrades (quoted on-site)
- Independent contractor Sweepers paid 60–68% of job revenue based on 
  accept speed + turnaround bonuses
- Strategic referral partners: roofing companies, realtors, lawn services

### Target Market
- Norman, OK homeowners (primary launch market)
- Young families with infants/toddlers (key segment — "baby-proof your shelter")
- Expand to Moore, Midwest City, OKC metro in year 2

### Soft Launch Target
June 16, 2026

---

## REPOSITORY & PROJECT SETUP

### Recommended Names
- **Repo:** `storm-sweep`
- **Supabase project:** `storm-sweep-prod`
- **Vercel project:** `storm-sweep`
- **Domain:** `stormsweep.com` (not yet registered — use localhost in dev)

### Tech Stack
```
Framework:     Next.js 14 (App Router)
Language:      TypeScript (strict)
Styling:       Tailwind CSS + shadcn/ui
Database:      Supabase (PostgreSQL + Auth + Storage + Realtime)
Hosting:       Vercel
Payments:      Stripe (subscriptions + one-time) + PayPal (one-time)
SMS:           Twilio
Email:         Resend (React Email templates)
Maps:          Google Maps API
AI Screening:  Anthropic Claude API (claude-sonnet-4-5, vision)
E-Signature:   DocuSeal
Social:        TikTok Content Posting API (Phase 4)
```

### Initialize Command
```bash
npx create-next-app@latest storm-sweep \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"

cd storm-sweep
npx shadcn@latest init
```

### Key Dependencies
```bash
npm install @supabase/supabase-js @supabase/ssr
npm install stripe @stripe/stripe-js
npm install twilio
npm install resend react-email @react-email/components
npm install @anthropic-ai/sdk
npm install @googlemaps/js-api-loader
npm install zod react-hook-form @hookform/resolvers
npm install date-fns
npm install lucide-react
```

---

## BRAND & DESIGN SYSTEM

### Color Palette (Tailwind custom config)
```js
// tailwind.config.ts
colors: {
  sky: {
    DEFAULT: '#2E86C1',
    light: '#5DADE2',
    dark: '#1A5276',
    pale: '#EBF5FB',
  },
  wheat: {
    DEFAULT: '#D4A843',
    light: '#F0C96B',
    pale: '#FDF6E3',
  },
  tornado: '#C0392B',
  shelter: '#141416',
}
```

### Typography
- **Display/Headlines:** Bebas Neue (Google Fonts)
- **UI/Body:** Barlow + Barlow Condensed (Google Fonts)
- **Fallback:** system-ui

### Design Principles
- Clean, minimal, Oklahoma-proud aesthetic
- Dark theme for admin/sweeper apps
- Light cream theme for public website + customer portal
- Every primary action button uses sky blue
- Membership/premium elements use wheat/gold
- Urgency/alerts use tornado red

---

## ROLES & ACCESS CONTROL

Three user roles enforced via Supabase RLS + Next.js middleware:

| Role | Portal Path | Access |
|------|-------------|--------|
| `customer` | `/dashboard`, `/history`, `/photos`, `/membership` | Own data only |
| `sweeper` | `/sweeper/*` | Assigned jobs only |
| `admin` | `/admin/*` | All data |

### Middleware (middleware.ts)
Protect all portal routes. Redirect unauthenticated users to `/login`.
Redirect wrong-role users to their correct portal root.
Public routes: `/`, `/services`, `/pricing`, `/book`, `/login`, `/register`, 
`/about`, `/sweepers/apply`, `/sweepers/apply/*`

---

## DATABASE SCHEMA (Supabase)

Run all migrations in order. Enable RLS on every table.

### Migration 001 — profiles
```sql
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  role text check (role in ('customer', 'sweeper', 'admin')) not null default 'customer',
  full_name text,
  phone text,
  address text,
  membership_status text check (membership_status in ('none','active','cancelled','past_due')) default 'none',
  membership_plan text check (membership_plan in ('annual','monthly')) ,
  stripe_customer_id text,
  stripe_subscription_id text,
  membership_renews_at timestamptz,
  created_at timestamptz default now()
);

-- RLS
alter table profiles enable row level security;
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Admins can view all profiles" on profiles for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
```

### Migration 002 — partners
```sql
create table partners (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  type text check (type in ('roofing','realtor','lawn','hoa','inspector','other')) not null,
  referral_code text unique not null,
  contact_name text,
  contact_phone text,
  payout_per_referral integer default 20,
  total_referrals integer default 0,
  total_payout_owed integer default 0,
  total_paid_out integer default 0,
  active boolean default true,
  notes text,
  created_at timestamptz default now()
);

alter table partners enable row level security;
create policy "Admins only" on partners for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
```

### Migration 003 — jobs
```sql
create table jobs (
  id uuid default gen_random_uuid() primary key,
  customer_id uuid references profiles(id) not null,
  sweeper_id uuid references profiles(id),
  status text check (status in ('pending','confirmed','in_progress','complete','cancelled')) default 'pending',
  service_type text[] not null default '{}',
  scheduled_at timestamptz,
  address text not null,
  shelter_size text check (shelter_size in ('small','standard','large','xlarge')) default 'standard',
  notes text,
  checklist_progress jsonb default '{}',
  upgrade_flags jsonb default '{}',
  total_amount integer not null,
  deposit_amount integer default 0,
  payment_status text check (payment_status in ('unpaid','deposit_paid','paid','refunded')) default 'unpaid',
  stripe_payment_intent_id text,
  paypal_order_id text,
  photo_urls text[] default '{}',
  photo_grade text,
  photo_flags text[] default '{}',
  photo_approved boolean default true,
  photo_surcharge integer default 0,
  photo_admin_note text,
  admin_reviewed_at timestamptz,
  customer_signed_at timestamptz,
  referral_source text,
  partner_id uuid references partners(id),
  completed_at timestamptz,
  created_at timestamptz default now()
);

alter table jobs enable row level security;
create policy "Customers see own jobs" on jobs for select using (auth.uid() = customer_id);
create policy "Sweepers see assigned jobs" on jobs for select using (auth.uid() = sweeper_id);
create policy "Sweepers can update assigned jobs" on jobs for update using (auth.uid() = sweeper_id);
create policy "Admins see all jobs" on jobs for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
```

### Migration 004 — job_photos
```sql
create table job_photos (
  id uuid default gen_random_uuid() primary key,
  job_id uuid references jobs(id) on delete cascade not null,
  photo_type text check (photo_type in ('before','after','upgrade','signature','booking_screen')) not null,
  storage_path text not null,
  uploaded_by uuid references profiles(id),
  customer_consent boolean default false,
  created_at timestamptz default now()
);

alter table job_photos enable row level security;
create policy "Customers see own job photos" on job_photos for select using (
  exists (select 1 from jobs where id = job_id and customer_id = auth.uid())
);
create policy "Sweepers see assigned job photos" on job_photos for select using (
  exists (select 1 from jobs where id = job_id and sweeper_id = auth.uid())
);
create policy "Admins see all" on job_photos for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
```

### Migration 005 — sweeper_applicants
```sql
create table sweeper_applicants (
  id uuid default gen_random_uuid() primary key,
  full_name text not null,
  email text unique not null,
  phone text not null,
  availability text check (availability in ('weekdays','weekends','both')) not null,
  has_vehicle boolean default false,
  heard_about text,
  experience_notes text,
  tool_photos jsonb default '{}',
  all_tools_verified boolean default false,
  agreement_signed boolean default false,
  agreement_pdf_path text,
  status text check (status in ('pending','approved','rejected')) default 'pending',
  admin_notes text,
  profile_id uuid references profiles(id),
  applied_at timestamptz default now(),
  approved_at timestamptz
);

alter table sweeper_applicants enable row level security;
create policy "Admins only" on sweeper_applicants for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
```

### Migration 006 — sms_log
```sql
create table sms_log (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid references profiles(id),
  job_id uuid references jobs(id),
  trigger text not null,
  body text not null,
  twilio_sid text,
  sent_at timestamptz default now()
);

alter table sms_log enable row level security;
create policy "Admins only" on sms_log for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
```

### Migration 007 — reviews
```sql
create table reviews (
  id uuid default gen_random_uuid() primary key,
  job_id uuid references jobs(id) unique not null,
  customer_id uuid references profiles(id) not null,
  rating integer check (rating between 1 and 5) not null,
  body text,
  photo_consent boolean default false,
  created_at timestamptz default now()
);

alter table reviews enable row level security;
create policy "Customers manage own reviews" on reviews for all using (auth.uid() = customer_id);
create policy "Admins see all" on reviews for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
```

### Migration 008 — social_posts (Phase 4)
```sql
create table social_posts (
  id uuid default gen_random_uuid() primary key,
  job_id uuid references jobs(id),
  platform text check (platform in ('tiktok','instagram','facebook')) not null,
  publish_id text,
  caption text,
  video_path text,
  customer_consent boolean default false,
  views integer default 0,
  likes integer default 0,
  shares integer default 0,
  published_at timestamptz,
  analytics_synced_at timestamptz,
  created_at timestamptz default now()
);
```

### Supabase Storage Buckets
```sql
-- Create buckets
insert into storage.buckets (id, name, public) values ('job-photos', 'job-photos', false);
insert into storage.buckets (id, name, public) values ('job-videos', 'job-videos', false);
insert into storage.buckets (id, name, public) values ('applicant-tools', 'applicant-tools', false);
insert into storage.buckets (id, name, public) values ('agreements', 'agreements', false);

-- Job photos: sweepers can upload, customers can read their own
create policy "Sweepers upload job photos" on storage.objects for insert
  with check (bucket_id = 'job-photos' and auth.role() = 'authenticated');
create policy "Authenticated read job photos" on storage.objects for select
  using (bucket_id = 'job-photos' and auth.role() = 'authenticated');
```

---

## ENVIRONMENT VARIABLES

### .env.local (never commit)
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_SINGLE_SWEEP_149_PRICE_ID=price_...
STRIPE_ANNUAL_PLAN_PRICE_ID=price_...
STRIPE_MONTHLY_PLAN_PRICE_ID=price_...

# PayPal
PAYPAL_CLIENT_ID=your-client-id
PAYPAL_CLIENT_SECRET=your-secret
NEXT_PUBLIC_PAYPAL_CLIENT_ID=your-client-id

# Twilio
TWILIO_ACCOUNT_SID=ACxxxx
TWILIO_AUTH_TOKEN=your-token
TWILIO_PHONE_NUMBER=+14055550100

# Resend
RESEND_API_KEY=re_xxxx
RESEND_FROM_EMAIL=hello@stormsweep.com

# Anthropic (AI Photo Screening)
ANTHROPIC_API_KEY=sk-ant-...

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_KEY=AIza...

# DocuSeal (IC Agreements)
DOCUSEAL_API_KEY=your-api-key
DOCUSEAL_IC_TEMPLATE_ID=template-id

# TikTok (Phase 4)
TIKTOK_ACCESS_TOKEN=your-access-token
TIKTOK_CLIENT_KEY=your-client-key
TIKTOK_CLIENT_SECRET=your-client-secret

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## FOLDER STRUCTURE

```
storm-sweep/
├── src/
│   ├── app/
│   │   ├── (public)/
│   │   │   ├── page.tsx                    # Homepage
│   │   │   ├── services/page.tsx
│   │   │   ├── pricing/page.tsx
│   │   │   ├── about/page.tsx
│   │   │   ├── book/
│   │   │   │   ├── page.tsx                # Booking form + payment
│   │   │   │   └── confirmation/page.tsx
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   │
│   │   ├── (customer)/
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── history/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [jobId]/page.tsx
│   │   │   ├── photos/page.tsx
│   │   │   ├── membership/page.tsx
│   │   │   └── account/page.tsx
│   │   │
│   │   ├── (sweeper)/
│   │   │   ├── sweeper/
│   │   │   │   ├── page.tsx                # Dashboard + job queue
│   │   │   │   ├── jobs/page.tsx
│   │   │   │   ├── jobs/[id]/page.tsx      # Checklist + photos + complete
│   │   │   │   ├── schedule/page.tsx
│   │   │   │   └── earnings/page.tsx
│   │   │
│   │   ├── (admin)/
│   │   │   ├── admin/
│   │   │   │   ├── page.tsx                # Main dashboard
│   │   │   │   ├── schedule/page.tsx
│   │   │   │   ├── jobs/page.tsx
│   │   │   │   ├── jobs/[id]/page.tsx
│   │   │   │   ├── customers/page.tsx
│   │   │   │   ├── customers/[id]/page.tsx
│   │   │   │   ├── crew/page.tsx
│   │   │   │   ├── revenue/page.tsx
│   │   │   │   ├── marketing/page.tsx
│   │   │   │   ├── partners/page.tsx
│   │   │   │   └── sweepers/
│   │   │   │       ├── page.tsx            # Applicant queue
│   │   │   │       └── [id]/page.tsx       # Review + approve
│   │   │
│   │   ├── sweepers/
│   │   │   └── apply/
│   │   │       ├── page.tsx                # Step 1: Application form
│   │   │       ├── tools/page.tsx          # Step 2: Tool photo uploads
│   │   │       ├── agreement/page.tsx      # Step 3: DocuSeal e-sign
│   │   │       └── confirmation/page.tsx   # Step 4: Pending review
│   │   │
│   │   └── api/
│   │       ├── bookings/route.ts
│   │       ├── stripe/
│   │       │   ├── checkout/route.ts
│   │       │   ├── webhook/route.ts
│   │       │   └── portal/route.ts         # Customer self-serve portal
│   │       ├── paypal/
│   │       │   ├── create-order/route.ts
│   │       │   └── capture-order/route.ts
│   │       ├── jobs/
│   │       │   ├── route.ts
│   │       │   └── [id]/route.ts
│   │       ├── photos/route.ts
│   │       ├── photo-screen/route.ts       # Claude Vision AI grading
│   │       ├── sms/route.ts                # Twilio SMS triggers
│   │       ├── sweepers/
│   │       │   ├── apply/route.ts
│   │       │   ├── approve/route.ts
│   │       │   └── reject/route.ts
│   │       └── tiktok/
│   │           ├── publish/route.ts        # Phase 4
│   │           └── analytics/route.ts      # Phase 4
│   │
│   ├── components/
│   │   ├── ui/                             # shadcn/ui components
│   │   ├── layout/
│   │   │   ├── Navbar.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── AdminSidebar.tsx
│   │   ├── booking/
│   │   │   ├── BookingForm.tsx
│   │   │   ├── BookingFooter.tsx        # Shared: price summary + Back/Continue (ALL steps)
│   │   │   ├── ServiceSelector.tsx      # Step 1
│   │   │   ├── KitSelector.tsx          # Step 2 — prep kit upsell
│   │   │   ├── CustomerDetails.tsx      # Step 3 — first/last name + Google Places address
│   │   │   ├── PhotoUpload.tsx          # Step 4 — AI screening
│   │   │   └── PaymentStep.tsx          # Step 5
│   │   ├── jobs/
│   │   │   ├── JobCard.tsx
│   │   │   ├── Checklist.tsx
│   │   │   ├── PhotoCapture.tsx
│   │   │   └── JobComplete.tsx
│   │   ├── customer/
│   │   │   ├── MembershipCard.tsx
│   │   │   ├── VisitCard.tsx
│   │   │   └── PhotoGallery.tsx
│   │   └── admin/
│   │       ├── KpiRow.tsx
│   │       ├── JobsTable.tsx
│   │       ├── RevenueChart.tsx
│   │       └── ActivityFeed.tsx
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts                   # Browser client
│   │   │   ├── server.ts                   # Server client
│   │   │   └── middleware.ts               # Auth middleware helper
│   │   ├── stripe.ts
│   │   ├── paypal.ts
│   │   ├── twilio.ts
│   │   ├── resend.ts
│   │   ├── anthropic.ts                    # Claude Vision helper
│   │   └── utils.ts
│   │
│   ├── types/
│   │   ├── database.ts                     # Supabase generated types
│   │   └── index.ts
│   │
│   └── middleware.ts                       # Route protection + role redirect
│
├── planning-docs/                          # All HTML planning documents
│   ├── brand-identity.html
│   ├── website-dark.html
│   ├── website-retro.html
│   ├── admin-app.html
│   ├── customer-portal.html
│   ├── super-admin-dash.html
│   ├── protocols-checklists.html
│   ├── meta-calendar.html
│   ├── tech-stack.html
│   └── master-business-plan.html
│
├── CLAUDE.md                               # AI assistant rules (see below)
├── SPEC.md                                 # This file
├── .env.local                              # Never commit
├── .env.example                            # Commit this — no real values
├── tailwind.config.ts
├── next.config.ts
└── package.json
```

---

## PHASES

---

### PHASE 1 — Foundation & Public Site
**Target: June 1–8, 2026**
**Goal: Working website + booking + sweeper onboarding + payment**

#### 1.1 — Project Initialization
- Initialize Next.js 14 with TypeScript + Tailwind + App Router
- Install and configure shadcn/ui
- Set up Supabase project, run all migrations 001–007
- Create Supabase storage buckets
- Configure Vercel deployment from GitHub
- Set all environment variables in Vercel dashboard
- Configure custom domain (stormsweep.com when registered)

#### 1.2 — Auth & Middleware
- Configure Supabase Auth (email/password + magic link + Google OAuth)
- Build middleware.ts — protects portal routes, enforces role-based redirects
- Build `/login` page with Supabase Auth UI or custom form
- Build `/register` page — auto-assigns 'customer' role on signup
- On first login, create profiles record if not exists (trigger or client-side)

#### 1.3 — Public Website
Build all pages matching the dark website design (planning-docs/website-dark.html):
- `/` — Homepage: hero, trust strip, services overview, how it works, 
         pricing cards, booking CTA, testimonials, footer
- `/services` — Full services page with all 4 service types + upgrade add-ons
- `/pricing` — Single Sweep vs Storm Ready comparison, both pricing cards
- `/about` — Norman OK local story, mission, team

Design reference: `planning-docs/website-dark.html`
Brand colors: sky (#2E86C1), wheat (#D4A843), charcoal (#141416)
Fonts: Bebas Neue (display), Barlow Condensed + Barlow (body)

#### 1.4 — Booking Flow
Multi-step booking form at `/book`. **6 steps total.**

**SHARED FOOTER CONVENTION (applies to ALL steps):**
Every booking step uses one shared `<BookingFooter>` component, modeled on
Step 1's layout. Structure, top to bottom:
1. Price summary bar — running total (prominent) + itemized line breakdown
   of every current selection (shelter size, each add-on, prep kit, etc.).
   Updates reactively from booking state; never hardcoded.
2. Nav row — text-only "← Back" button left-aligned (hidden on Step 1),
   prominent primary "Continue" button right-aligned.
3. Continue button styling MUST be visible by default (not only on hover)
   in BOTH themes: dark = bg-[#2E86C1] white text, hover bg-[#5DADE2];
   retro = match existing retro primary button.
4. Positioning matches Step 1 (sticky vs static — keep whatever Step 1 uses).
Props: currentStep, totalSteps, onBack, onContinue, continueLabel,
continueDisabled. Used identically in all 6 steps — no per-step button
variants or alternate placements.

**Step 1 — Service Selection**
- Shelter size selector (small $129 / standard $149 / large $179)
- Service type checkboxes: Deep Clean, LED Package (+$89), Full Package
- Membership option: One-time visit OR Storm Ready annual ($249) OR monthly ($24/mo)
- Dynamic price calculation as selections change
- No Back button (first step); Continue only

**Step 2 — Prep Kit Selector (KitSelector.tsx)**
- Safety preparation kit upsell. Bundles display first; à la carte hidden
  behind "Build your own" expand; "Skip for now" always visible.
- Bundles: Storm Starter $79, Family Ready $89, Pet Ready $89, Full House $149
- À la carte kits: Shelter Ready $59, Little Ones $49, Pets $39, Hygiene Pack $24
- Price summary bar updates as kit selections change

**Step 3 — Customer Details**
- First Name + Last Name (TWO separate fields — not a single full-name field)
- Email, phone
- Service address with Google Places autocomplete (Norman OK biased;
  graceful fallback to plain text if Places API unavailable)
- Preferred date (date picker, min 24hrs out)
- Notes field (gate codes, dogs, access info)
- How did you hear about us? (dropdown includes partner referral codes)
- Auto-populate if logged in
- Must validate required fields before advancing to Step 4

**Step 4 — Shelter Photo Upload (AI Screening)**
- Optional but encouraged: "Upload a photo of your shelter so your Sweeper arrives prepared"
- Upload to Supabase Storage → call `/api/photo-screen` → display grade to customer
- Grade A/B: "Looks great! Your booking is confirmed."
- Grade C: "We'll review this and confirm within 2 hours."
- Grade D/F: "Our team will contact you shortly to discuss before confirming."
- Notify admin via SMS for C/D/F grades

**Step 5 — Payment**
- Show Stripe Checkout for card payment (deposit = 50% of total, balance due after service)
- Show PayPal button as alternative
- On Stripe success: webhook fires → create job record → send confirmation SMS + email
- On PayPal success: capture order → create job record → send confirmation SMS + email
- Redirect to `/book/confirmation`

**Step 6 — Confirmation**
- Display booking summary
- Link to create account (if not logged in) to access customer portal
- "You'll receive a text confirmation shortly"

#### 1.5 — Sweeper Onboarding Portal
4-step application flow at `/sweepers/apply`:

**Step 1 — Application Form** (`/sweepers/apply`)
Fields: full_name, email, phone, availability (weekdays/weekends/both), 
has_vehicle (boolean), experience_notes, heard_about
On submit: create sweeper_applicants record, send admin notification SMS

**Step 2 — Tool Photos** (`/sweepers/apply/tools`)
7 required uploads — each with label and example image:
1. Shop vacuum (wet/dry capable)
2. Stiff scrub brushes (2+ shown)
3. Mop + bucket
4. Extension cord (25ft+ unrolled)
5. Outdoor/leaf blower
6. Headlamp (switched on)
7. PPE: N95 mask + gloves together
Upload to Supabase Storage `applicant-tools` bucket
Track completion: all_tools_verified = true when all 7 uploaded

**Step 3 — IC Agreement** (`/sweepers/apply/agreement`)
Embed DocuSeal signing iframe using DOCUSEAL_IC_TEMPLATE_ID
On completion webhook: set agreement_signed = true, store PDF path
Agreement covers: scope of work, IC status, 1099 acknowledgment, 
pay structure, non-solicitation, photo/content consent, equipment responsibility

**Step 4 — Confirmation** (`/sweepers/apply/confirmation`)
Display: "Application received! We review within 24 hours. 
You'll receive a text when approved."

**Admin Approval** (`/admin/sweepers`)
- Queue of pending applicants with completion status badges
- View all tool photos in lightbox
- Approve button → calls `/api/sweepers/approve`:
  - Creates Supabase auth user
  - Creates profiles record with role: 'sweeper'
  - Sends welcome SMS with login link + temp password
- Reject button → calls `/api/sweepers/reject`:
  - Sends polite decline SMS
  - Sets status = 'rejected'

#### 1.6 — AI Photo Screening API
Route: `POST /api/photo-screen`
- Accept base64 image + mediaType + bookingId
- Call Anthropic claude-sonnet-4-5 vision model
- Grading prompt returns JSON: { grade, approved, flags, surcharge_suggested, 
  surcharge_amount, admin_note, customer_message }
- Grade A/B: auto-approve (photo_approved = true)
- Grade C/D/F: set photo_approved = false, notify admin via Twilio SMS
- Update booking record with all photo screening fields
- Return result to client for display

#### 1.7 — SMS Automation (Twilio)
Route: `POST /api/sms`
Accept: { trigger, jobId, profileId, customData? }

Implement all 8 message templates:
1. `booking_confirmed` — fires on successful payment
2. `day_before_reminder` — scheduled 24hrs before job (use Supabase Edge Function or cron)
3. `on_the_way` — sweeper taps En Route in app
4. `job_started` — sweeper taps Start Job
5. `job_complete` — sweeper marks complete
6. `review_request` — 30 min after job_complete
7. `membership_renewal` — 30 days before renewal date
8. `tornado_season` — April 1 blast to all customers

Log every SMS to sms_log table with trigger + twilio_sid.

#### 1.8 — Email (Resend)
Build React Email templates for:
- Booking confirmation (with job summary + portal link)
- Job complete report (with before/after photo links)
- Membership welcome
- Membership receipt

---

### PHASE 2 — Sweeper App + Admin Core
**Target: June 8–14, 2026**
**Goal: Sweepers can manage jobs. Admin can see everything.**

#### 2.1 — Sweeper Dashboard (`/sweeper`)
Mobile-first dark theme. Reference: `planning-docs/admin-app.html`

Components:
- Online/Offline toggle (updates sweeper availability in profiles table)
- Today's stats: jobs count, estimated earnings, completed count
- Job queue: cards showing customer name, address, time, service tags, membership badge
- "Next Up" card highlighted with navigate + start buttons

#### 2.2 — Job Detail (`/sweeper/jobs/[id]`)
- Customer info: name, address, gate code/notes, membership status
- Google Maps embed with "Open in Maps" deep link
- Service list with prices
- Tap-to-complete checklist (updates checklist_progress jsonb in real time via Supabase)
- Progress bar showing % complete
- Photo upload grid:
  - Before photos (required — 2 minimum)
  - After photos (required — 2 minimum)
  - Upgrade photos (optional)
  - Video clips — before + after (optional but earns +$10 bonus)
- Upgrade flags section — tap to log each potential upsell
- Customer digital signature capture
- Mark Complete button:
  - Validates: all required checklist items, min 2 before + 2 after photos, signature
  - Sets job status = 'complete', completed_at = now()
  - Triggers: job_complete SMS, review_request SMS (30min delay), 
    unlocks photos in customer portal

#### 2.3 — Sweeper Schedule (`/sweeper/schedule`)
- 7-day scrollable day selector
- Timeline view for selected day
- Job blocks showing time, customer name, service type, membership tag

#### 2.4 — Sweeper Earnings (`/sweeper/earnings`)
- This week / this month toggle
- Earnings card: total, job count, avg per job
- Per-job history with earnings breakdown:
  - Base pay (60–68% based on accept speed)
  - Turnaround bonus (if applicable)
  - Video bonus (+$10 if both videos uploaded)
  - Upgrade commissions (+$15 per upgrade)

#### 2.5 — Admin Dashboard (`/admin`)
Desktop-first dark theme. Reference: `planning-docs/super-admin-dash.html`

Sidebar navigation: Dashboard, Schedule, All Jobs, Customers, Crew, 
Revenue, Marketing, Partners, Sweepers (applicants)

Main dashboard widgets:
- KPI row: Revenue MTD, Jobs this week, Active members, Avg job value, Review score
- Today's jobs table: customer, time, services, tech, status, value, actions
- Live activity feed: bookings, completions, new members, reviews (Supabase Realtime)
- Revenue mini chart (last 8 weeks)
- Crew status cards

#### 2.6 — Admin Schedule (`/admin/schedule`)
- 5-day week view
- Job blocks per day, color-coded by status
- Drag-and-drop sweeper assignment (or dropdown)
- Today highlighted

#### 2.7 — Admin Job Management (`/admin/jobs`, `/admin/jobs/[id]`)
- Searchable, filterable jobs table
- Individual job detail: all photos, checklist progress, notes, edit, reassign

---

### PHASE 3 — Customer Portal + Memberships
**Target: June 14–21, 2026**

#### 3.1 — Customer Dashboard (`/dashboard`)
Light cream theme. Reference: `planning-docs/customer-portal.html`
- Welcome band with membership status pill
- Quick stats: total visits, upcoming, discount %
- Next service card with reschedule/add-upgrade actions
- Recent visits with photo strip preview

#### 3.2 — Job History (`/history`, `/history/[jobId]`)
- All visits filterable by year / service type
- Each visit: date, services, tech name, before/after photo strip, report link, rating
- Individual job detail: full photo gallery, full checklist, sweeper notes, PDF download

#### 3.3 — Photos (`/photos`)
- Grid of all before/after/upgrade photos across all jobs
- Filter by type (before/after/upgrade)

#### 3.4 — Membership (`/membership`)
Stripe Subscriptions setup:
- Create two Stripe Price objects: annual $249/yr, monthly $24/mo
- Checkout: customer selects plan → Stripe Checkout Session → 
  webhook: customer.subscription.created → set membership_status = 'active' in profiles
- Membership page shows: plan card, benefits tracker, visits remaining, 
  kit refresh status, book visit CTA, upgrade CTA
- Stripe Customer Portal link for self-serve cancel/upgrade (`/api/stripe/portal`)
- Membership cancel: webhook customer.subscription.deleted → set status = 'cancelled'

#### 3.5 — Account (`/account`)
- Edit name, phone, address, notification preferences

---

### PHASE 4 — Polish, Analytics & Growth
**Target: June 21+, Post-Launch**

#### 4.1 — Admin Revenue Charts
Supabase aggregation queries for revenue by week/month/service type
Display in admin revenue page with bar charts (use Recharts)

#### 4.2 — Admin Partners Page (`/admin/partners`)
- Partner list: name, type, referral code, total referrals, owed, paid
- Add/edit partner modal
- Mark paid button (updates total_paid_out, resets total_payout_owed)
- QR code generator per partner (embed referral_code in booking URL param)

#### 4.3 — Supabase Realtime
Enable realtime on jobs table for admin dashboard activity feed
Enable realtime on job checklist_progress for live progress in admin job detail

#### 4.4 — Google Maps Route Optimization
In sweeper schedule: show all day's jobs on map
Optimize route order (Google Maps Directions API with waypoints)

#### 4.5 — Referral Program
Customer portal: unique referral link (referral_code on profiles)
Admin: track referral conversions, credit $25 to referrer's account
Customer: see referral credits in account page

#### 4.6 — Review System
Post-job in-app rating (1–5 stars + optional text)
If rating ≥ 4: auto-surface Google review deep link
If rating < 4: route to internal feedback form only (protect public score)

#### 4.7 — TikTok Integration
- Register TikTok for Business + apply for Content Posting API
- Admin marketing panel: approved videos queue, one-click publish to TikTok
- POST /api/tiktok/publish: upload video from Supabase Storage → TikTok API
- GET /api/tiktok/analytics: sync views/likes/shares to social_posts table
- Display analytics in admin marketing panel

#### 4.8 — PWA for Sweeper App
Add manifest.json and service worker so sweepers can "Add to Home Screen"
Offline checklist functionality (sync when reconnected)

#### 4.9 — Tornado Season Campaign Automation
Supabase Edge Function (cron) runs April 1 each year:
- Query all profiles with phone numbers
- Send tornado_season SMS template to all customers
- Log to sms_log

---

## API ROUTES REFERENCE

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | /api/bookings | public | Create booking + trigger payment |
| POST | /api/stripe/checkout | public | Create Stripe checkout session |
| POST | /api/stripe/webhook | none (Stripe sig) | Handle payment events |
| GET | /api/stripe/portal | customer | Create Stripe customer portal session |
| POST | /api/paypal/create-order | public | Create PayPal order |
| POST | /api/paypal/capture-order | public | Capture PayPal order |
| GET | /api/jobs | sweeper/admin | List jobs (filtered by role) |
| PATCH | /api/jobs/[id] | sweeper/admin | Update job status/checklist/notes |
| POST | /api/photos | sweeper | Upload photo to Supabase Storage |
| POST | /api/photo-screen | public | Claude Vision shelter photo grading |
| POST | /api/sms | internal | Trigger Twilio SMS by event type |
| POST | /api/sweepers/apply | public | Create sweeper applicant record |
| POST | /api/sweepers/approve | admin | Approve applicant + create account |
| POST | /api/sweepers/reject | admin | Reject applicant + send SMS |
| POST | /api/tiktok/publish | admin | Publish video to TikTok (Phase 4) |
| GET | /api/tiktok/analytics | admin | Sync TikTok metrics (Phase 4) |

---

## SMS MESSAGE TEMPLATES

All templates live in `src/lib/twilio.ts`:

```typescript
const SMS_TEMPLATES = {
  booking_confirmed: (name: string, date: string, window: string, sweeperName: string) =>
    `Hi ${name}! Your Storm Sweep is confirmed for ${date} between ${window}. Your Sweeper will be ${sweeperName}. We'll text when they're on the way. Questions? Reply here. – Storm Sweep 🌪️`,

  day_before_reminder: (name: string, window: string) =>
    `Reminder: Storm Sweep is tomorrow between ${window}. Please make sure the garage is accessible. Reply RESCHEDULE if needed. – Storm Sweep`,

  on_the_way: (sweeperName: string) =>
    `Your Sweeper ${sweeperName} is on the way — about 15 minutes out. See you soon! 🌪️`,

  job_started: () =>
    `Your shelter cleaning is underway! Before photos uploaded. Follow along in your portal. ✅`,

  job_complete: (name: string, portalUrl: string, hasUpgrades: boolean) =>
    `Your Storm Sweep is complete! 🎉 Before & after photos + your service report are ready: ${portalUrl}${hasUpgrades ? ' Your Sweeper noted some upgrade recommendations — check your report.' : ''} Thank you, ${name}!`,

  review_request: (googleUrl: string) =>
    `Hi! Hope everything looks great. If you have 30 seconds, a Google review means the world to a small local business. 🙏 ${googleUrl} — Storm Sweep, Norman OK`,

  membership_renewal: (name: string, date: string, bookUrl: string) =>
    `Hey ${name} — your Storm Ready membership renews in 30 days on ${date}. Auto-renews via Stripe. Time to schedule your next visit? ${bookUrl} 🌪️`,

  tornado_season: (bookUrl: string) =>
    `🌪️ Tornado season is here, Norman. Is your shelter ready? Storm Sweep is booking fast — secure your spot before May. Book now: ${bookUrl} — Storm Sweep, your local shelter pros.`,

  sweeper_welcome: (name: string, loginUrl: string, tempPassword: string) =>
    `Welcome to Storm Sweep, ${name}! 🌪️ Your Sweeper account is live. Login: ${loginUrl} — temp password: ${tempPassword}. Change it on first login.`,

  sweeper_new_job: (customerName: string, address: string, date: string) =>
    `New Storm Sweep job available: ${customerName} at ${address} on ${date}. Open your app to accept. Faster accept = higher pay! 🌪️`,
}
```

---

## PRICING CONSTANTS

```typescript
// src/lib/utils.ts
export const PRICING = {
  shelter: {
    small: 129,
    standard: 149,
    large: 179,
    xlarge: null, // quoted
  },
  addons: {
    led_package: 89,
    supply_kit_starter: 29,
    supply_kit_essential: 49,
    supply_kit_family: 79,
    supply_kit_pro: 109,
    supply_kit_elite: 149,
    interior_handle: 45,
    hinge_service: 35,
    lock_replacement: 65,
    extension_cord: 15,
  },
  membership: {
    annual: 249,
    monthly: 24,
  },
  bundles: {
    clean_plus_led: 219,        // standard clean + LED
    clean_plus_kit_basic: 179,  // standard + essential kit
    full_package: 299,           // clean + LED + standard kit
  },
  sweeper: {
    base_pct: 0.60,
    accept_1hr_pct: 0.68,
    accept_4hr_pct: 0.64,
    accept_24hr_pct: 0.62,
    turnaround_same_day: 25,
    turnaround_day_1: 20,
    turnaround_day_2: 10,
    turnaround_day_3: 5,
    upgrade_commission: 15,
    video_bonus: 10,
  },
  referral: {
    customer_credit: 25,
    partner_roofing: 20,
    partner_realtor: 25,
    partner_lawn: 15,
  },
  deposit_pct: 0.50, // 50% deposit at booking
}
```

---

## CHECKLIST ITEMS (Standard Clean)

```typescript
// src/lib/utils.ts
export const CHECKLIST_ITEMS = [
  // Phase 1: Arrival
  { id: 'arrive_01', phase: 1, label: 'Confirm en route text sent', required: true },
  { id: 'arrive_02', phase: 1, label: 'Take BEFORE photo — exterior hatch', required: true, photo: true },
  { id: 'arrive_03', phase: 1, label: 'Take BEFORE photo — interior wide shot', required: true, photo: true },
  { id: 'arrive_04', phase: 1, label: 'Check for standing water or structural hazard', required: true },
  { id: 'arrive_05', phase: 1, label: 'Note shelter size in app', required: false },
  { id: 'arrive_06', phase: 1, label: 'Note any pest presence', required: false },

  // Phase 2: Deep Clean
  { id: 'clean_01', phase: 2, label: 'Remove debris and trash — bag for customer review', required: true },
  { id: 'clean_02', phase: 2, label: 'Vacuum ceiling and walls top-down', required: false },
  { id: 'clean_03', phase: 2, label: 'Vacuum floor — all corners and step areas', required: false },
  { id: 'clean_04', phase: 2, label: 'Apply mold/mildew spray — dwell 5 minutes', required: true },
  { id: 'clean_05', phase: 2, label: 'Scrub walls and ceiling with stiff brush', required: false },
  { id: 'clean_06', phase: 2, label: 'Scrub floor — treads and corners', required: false },
  { id: 'clean_07', phase: 2, label: 'Rinse walls and floor', required: false },
  { id: 'clean_08', phase: 2, label: 'Apply deodorizer', required: false },
  { id: 'clean_09', phase: 2, label: 'Clean door hatch interior and hinges', required: false },

  // Phase 3: Inspection
  { id: 'inspect_01', phase: 3, label: 'Inspect hatch door — damage, rust, warping', required: true, upsell: 'door' },
  { id: 'inspect_02', phase: 3, label: 'Test hinges — open/close fully', required: true, upsell: 'door' },
  { id: 'inspect_03', phase: 3, label: 'Test interior lock mechanism', required: true },
  { id: 'inspect_04', phase: 3, label: 'Check interior handle — present?', required: true, upsell: 'handle' },
  { id: 'inspect_05', phase: 3, label: 'Check existing lighting', required: true, upsell: 'led' },
  { id: 'inspect_06', phase: 3, label: 'Check walls for cracks or water intrusion', required: true, photo: true },
  { id: 'inspect_07', phase: 3, label: 'Note emergency supplies present', required: false, upsell: 'kit' },
  { id: 'inspect_08', phase: 3, label: 'Log all upgrade opportunities in app', required: true },

  // Phase 4: Wrap-Up
  { id: 'wrap_01', phase: 4, label: 'Take AFTER photo — interior wide shot', required: true, photo: true },
  { id: 'wrap_02', phase: 4, label: 'Take AFTER photo — exterior hatch', required: true, photo: true },
  { id: 'wrap_03', phase: 4, label: 'Upload all photos before leaving property', required: true },
  { id: 'wrap_04', phase: 4, label: 'Walk customer to shelter — show finished work', required: true },
  { id: 'wrap_05', phase: 4, label: 'Present upgrade recommendations verbally', required: false },
  { id: 'wrap_06', phase: 4, label: 'Get customer digital signature', required: true },
  { id: 'wrap_07', phase: 4, label: 'Mark job complete in app', required: true },
]
```

---

## SUPPLY KIT TIERS

```typescript
export const SUPPLY_KITS = {
  starter: {
    name: 'Starter Kit', price: 29,
    items: ['1L water (2-pack)', 'Mini first aid kit', 'Emergency whistle', 'LED keychain flashlight', 'Storm Sweep checklist card']
  },
  essential: {
    name: 'Essential Kit', price: 49,
    items: ['2L water (3-pack)', 'Standard first aid kit', 'Hand-crank weather radio', 'Emergency mylar blankets (2)', 'USB power bank 5000mAh', 'Universal phone cable']
  },
  family: {
    name: 'Family Kit', price: 79,
    items: ['Everything in Essential', 'Extra water (6-pack total)', '3-day food bars (2 person)', 'Baby/toddler comfort items', 'Extra mylar blankets (4)', 'Dust masks (4-pack)', 'Glow sticks (6-pack)']
  },
  pro: {
    name: 'Pro Kit', price: 109,
    items: ['Everything in Family', '72-hr water supply (family of 4)', 'Full first aid with trauma items', 'Hand-crank + solar radio/flashlight', '20,000mAh power bank', 'Multi-tool', 'Waterproof document pouch', 'N95 masks (4-pack)']
  },
  elite: {
    name: 'Storm Ready Elite', price: 149,
    items: ['Everything in Pro', '7-day water supply', '72-hr emergency food (4 person)', 'Portable toilet kit', 'Cash envelope ($20 small bills)', 'Extra medication organizer', 'Kids activity/comfort pack', 'Laminated family emergency card', 'Storm Sweep branded storage bin']
  }
}
```

---

## KEY BUSINESS RULES

1. **Photo requirement:** Jobs cannot be marked complete without minimum 2 before + 2 after photos uploaded
2. **Checklist requirement:** All `required: true` items must be checked before marking complete
3. **Signature requirement:** Customer digital signature required before job complete
4. **Photo consent:** Marketing use of photos requires explicit customer opt-in (default OFF)
5. **Junk policy:** If excessive junk found on arrival not shown in pre-booking photo, sweeper contacts admin before proceeding — never removes large items without approval
6. **Hazard protocol:** Standing water, structural damage, mold beyond surface level = stop work immediately, photograph, contact admin
7. **IC tax:** Sweepers earning $600+/yr get 1099-NEC by Jan 31. No tax withholding.
8. **Off-platform solicitation:** Sweeper soliciting customers outside the app = immediate IC termination
9. **Turnaround timing:** Measured from booking creation timestamp to job completed_at timestamp
10. **Partner referral:** referral_code in booking URL param auto-populates referral_source and sets partner_id on job record
11. **Membership deposit:** Members use 1 of their 2 annual visits per booking; tracked via visits_used counter on profiles

---

## STRATEGIC PARTNERS

Three core referral partner categories with payout structure:

| Type | Payout | Why They Work |
|------|--------|---------------|
| Roofing companies | $20/booking | Post-storm urgency, on-site at homes, same neighborhoods |
| Realtors | $25/booking | New homeowners inheriting unknown shelters — perfect timing |
| Lawn services | $15/booking | In driveways weekly, see shelter hatches, trusted by homeowner |
| Home inspectors | $25/booking | Find shelter issues, need someone to refer |
| HOA managers | Bulk rate | Neighborhood-level volume bookings |

Partner QR codes: each partner gets a unique URL like `stormsweep.com/book?ref=ABC_ROOFING`
The `ref` param auto-populates referral_source in the booking form and links to partner_id.

---

## LAUNCH CHECKLIST

Before going live on June 16:

### Legal
- [ ] File Storm Sweep LLC — Oklahoma Secretary of State (sos.ok.gov) — $100
- [ ] Obtain EIN — irs.gov — free
- [ ] Open business bank account (Mercury or Relay)
- [ ] Get GL insurance quote (Next Insurance) — ~$65/mo
- [ ] Add commercial auto endorsement — ~$100/mo
- [ ] Draft IC sweeper agreement via Clerky or attorney — ~$300 one-time

### Tech
- [ ] Register stormsweep.com domain
- [ ] Initialize repo, Supabase project, Vercel deployment
- [ ] Run all 7 database migrations
- [ ] Create Supabase Storage buckets
- [ ] Set all env vars in Vercel dashboard
- [ ] Configure Stripe (create products + prices for all tiers)
- [ ] Register Stripe webhook endpoint
- [ ] Purchase Twilio 405 area code number
- [ ] Set up Resend + verify domain
- [ ] Install Meta Pixel on public pages
- [ ] Apply for TikTok for Business account (takes 1–5 days)
- [ ] Create Google Business Profile
- [ ] Test full booking → SMS → job → complete flow end-to-end

### Operations
- [ ] Recruit + approve first Sweeper via OU Handshake + Facebook groups
- [ ] Order first uniform shirts (5–10 units)
- [ ] Order supply kit inventory (Starter + Essential tiers)
- [ ] Order LED units (clip-on first-visit + panel install units)
- [ ] Conduct 2 test jobs (friends/family) to validate full flow

### Marketing
- [ ] Create Facebook Business Page + Instagram @stormsweepok
- [ ] Create TikTok @stormsweepok
- [ ] Build Canva brand templates (before/after, quote card, promo graphic)
- [ ] Schedule first 2 weeks of posts in Buffer
- [ ] Launch Meta paid ad — Free Kit offer, $30 initial budget
- [ ] Post OU sweeper recruitment on Handshake + OU Facebook groups
- [ ] Reach out to 3 roofing companies + 5 realtors for referral partnerships

---

*End of SPEC.md*
*For project conventions and AI assistant rules, see CLAUDE.md*
