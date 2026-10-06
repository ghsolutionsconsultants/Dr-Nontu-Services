# Dr Nontu Medical Practice: website & booking system

Next.js 16 (App Router) · Postgres (PGlite locally, Supabase in production) · Paystack · Resend · Three.js

## Run it locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. The first request creates a local database in `.data/` (PGlite, no install needed) and seeds it with the practice's services, locations, opening hours and **placeholder fees**.

- Admin: http://localhost:3000/admin. The first admin account comes from `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env.local`.
- Payments: with no `PAYSTACK_SECRET_KEY`, online payments go through a built-in **test checkout** (`/pay/test`) that follows the same path as Paystack.
- Email: with no `RESEND_API_KEY`, every email is stored and viewable in **Admin → Emails sent**.

```bash
npm test          # slot engine tests
npm run lint
npm run build
```

## What's where

| Path | |
| --- | --- |
| `app/(site)/` | Public pages: home, about, services (+ one page per service), house calls, care plans, fees, contact, FAQ, legal, booking, manage booking |
| `app/admin/` | Practice admin: overview, calendar, bookings, availability, fees & lengths, payments, financials, site stats, SEO, emails, settings |
| `app/api/` | Booking, availability, slots, payments (start / callback / webhook / test), manage, analytics, cron, admin feeds & CSV export |
| `lib/slots.ts` | The slot engine (pure, tested): opening windows − bookings (+ travel/turnover buffers) − blocked time − lead time |
| `lib/booking.ts` | Create / reschedule / cancel; unpaid holds expire after 15 min |
| `lib/db/schema.sql` | Schema. A Postgres **exclusion constraint** guarantees no two live bookings overlap, across all locations and modes (one doctor) |
| `components/three/engine.ts` | All 3D objects, loaded only on pages that show them |
| `app/site.css` | Design system: logo colours, one 12-column grid, one section rhythm |

## Go live

1. **Supabase**: create a project and copy the pooled connection string (Project settings → Database, port 6543) into `DATABASE_URL`. Run `npm run db:migrate` once to create tables and seed.
2. **Paystack**: copy the secret key into `PAYSTACK_SECRET_KEY`. In Paystack → Settings → API Keys & Webhooks, set the webhook URL to `https://<your-domain>/api/pay/webhook`.
3. **Resend**: verify `drnontu.co.za`, then set `RESEND_API_KEY` and `MAIL_FROM`.
4. **Vercel**: import the `site` folder and set the variables from `.env.example` (including a long random `SESSION_SECRET` and a `CRON_SECRET`). `vercel.json` schedules hourly appointment reminders.
5. In Admin: set real **fees**, confirm **opening hours per location**, add **leave**, and change the admin password.
6. Submit `/sitemap.xml` in Google Search Console and claim Google Business Profiles for both locations.

## Content still needed from the practice

Real fees · care plan benefits & prices · medical aids accepted · which number is WhatsApp · social links · vector logo · confirmation of drafted FAQ answers and legal copy (`lib/content.ts`, `lib/legal.tsx`) · which days each location is open.
