# Muzungu Price Web App (MVP)

`Muzungu Price` is a verified local-services marketplace focused on:

- Provider verification and trust scoring
- Transparent fixed public pricing ("This not Muzungu Price")
- Quotation / EBM capability visibility for NGOs, embassies, and institutions
- Request → offer → booking workflow
- Transaction-based ratings and reviews

## Tech stack

- Next.js (App Router, TypeScript)
- Prisma ORM
- Supabase Postgres
- JWT cookie sessions

## Features included

- Auth (register/login/logout)
  - Login with email + password
  - Signup verification options: Email / SMS / WhatsApp
- Marketplace listing with filters:
  - Verified providers only
  - Quotation-ready providers
  - EBM-ready providers
  - Category/city filters
- Provider detail page with:
  - Verification status
  - Public price cards
  - Reviews
- Provider Hub:
  - Create/update provider profile
  - Add service and tiered price cards
  - Enable Quotation / EBM flags
  - Open verification case and upload document metadata
- Requests and matching:
  - Customer/institution request creation
  - Provider offer submission
  - Offer acceptance to create booking
  - Booking status updates
  - Completed-booking review submission
- Admin verification center:
  - Review submitted verification cases
  - Assign decision, score, level, and notes

## Quick start

Create a Supabase project first, then set these env vars in `.env`:

```bash
DATABASE_URL="postgresql://...pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require"
DIRECT_URL="postgresql://...db.<project-ref>.supabase.co:5432/postgres?sslmode=require"
AUTH_SECRET="change-this-secret"
```

1. Install dependencies:

```bash
npm install
```

2. Run the app:

```bash
npm run dev
```

`npm run dev` automatically runs Prisma generate, database sync, and seed before starting Next.js.

3. Open http://localhost:3000

## Demo users after seeding

- Admin: `admin@muzunguprice.com` / `admin1234`
- Provider: `electric.pro@example.com` / `provider1234`

Create a new customer account from `/auth` for request/review flow testing.

## API overview

Main endpoints are under `/api`:

- `/api/auth/*`
- `/api/providers`, `/api/providers/:id`
- `/api/provider/*`
- `/api/requests/*`
- `/api/offers/:offerId/accept`
- `/api/bookings/:bookingId/status`
- `/api/bookings/:bookingId/review`
- `/api/admin/verification-cases*`

## Deploy (Supabase + Vercel)

1. Create a Supabase project.
2. Copy:
   - pooled connection string -> `DATABASE_URL`
   - direct connection string -> `DIRECT_URL`
3. Push schema once from local:

```bash
npm run db:push
npm run db:seed
```

4. Push your branch to GitHub.
5. In Vercel, import this GitHub repo and deploy.
6. In Vercel Project Settings -> Environment Variables, add:
   - `DATABASE_URL`
   - `DIRECT_URL`
   - `AUTH_SECRET`
   - verification delivery vars (Resend/Twilio) listed below
7. Redeploy from Vercel after env vars are saved.

### Verification-code delivery configuration (real sending)

Signup verification codes support direct provider delivery:

- **Email (Resend API)**
  - `AUTH_RESEND_API_KEY`
  - `AUTH_RESEND_FROM`
- **SMS / WhatsApp (Twilio API)**
  - `AUTH_TWILIO_ACCOUNT_SID`
  - `AUTH_TWILIO_AUTH_TOKEN`
  - `AUTH_TWILIO_SMS_FROM` (for SMS)
  - `AUTH_TWILIO_WHATSAPP_FROM` (for WhatsApp, e.g. `whatsapp:+14155238886`)
  - optional `AUTH_DEFAULT_COUNTRY_CODE` (default: `250`) for local numbers without `+`

Optional webhook fallbacks are still supported:

- `AUTH_EMAIL_WEBHOOK_URL` (+ optional `AUTH_EMAIL_WEBHOOK_TOKEN`)
- `AUTH_SMS_WEBHOOK_URL` (+ optional `AUTH_SMS_WEBHOOK_TOKEN`)
- `AUTH_WHATSAPP_WEBHOOK_URL` (+ optional `AUTH_WHATSAPP_WEBHOOK_TOKEN`)

Mock behavior:

- mock delivery is **disabled by default** in every environment
- if no real provider is configured, API returns an explicit error
- enable mock only when needed via `AUTH_ALLOW_MOCK_VERIFICATION=true`
