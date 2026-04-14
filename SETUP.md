# Haven – Setup Guide

## 1. Environment variables

Copy `.env.local.example` to `.env.local` and fill in your values:

```bash
cp .env.local.example .env.local
```

Required values:
- **NEXT_PUBLIC_SUPABASE_URL** — from your Supabase project Settings → API
- **NEXT_PUBLIC_SUPABASE_ANON_KEY** — from the same page
- **SUPABASE_SERVICE_ROLE_KEY** — from the same page (keep secret)
- **NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY** — from Stripe Dashboard → Developers → API keys
- **STRIPE_SECRET_KEY** — same page (keep secret)
- **STRIPE_WEBHOOK_SECRET** — see step 4
- **NEXT_PUBLIC_APP_URL** — your deployed URL (e.g. `https://haven.vercel.app`)

## 2. Supabase database setup

In your Supabase dashboard, go to **SQL Editor** and run the contents of `supabase/schema.sql`.

This creates:
- `profiles` table (auto-populated on signup)
- `notes` table
- `purchases` table
- RLS policies for all tables
- Storage bucket `haven-files` (private, 20MB limit)
- Helper functions `increment_views` and `increment_downloads`

## 3. Supabase Auth setup

In Supabase Dashboard → Authentication → URL Configuration:
- Set **Site URL** to your app URL
- Add `https://your-domain.com/auth/callback` to **Redirect URLs**

To enable magic link emails:
- Go to Authentication → Email Templates — the default template works fine.

## 4. Stripe webhook setup

For local development:
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```
Copy the webhook signing secret and add it as `STRIPE_WEBHOOK_SECRET`.

For production:
- In Stripe Dashboard → Developers → Webhooks, add an endpoint:
  - URL: `https://your-domain.com/api/stripe/webhook`
  - Events: `payment_intent.succeeded`
- Copy the signing secret to `STRIPE_WEBHOOK_SECRET`

## 5. Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## 6. Deploy to Vercel

```bash
npx vercel
```

Set all environment variables in the Vercel project settings before deploying to production.
