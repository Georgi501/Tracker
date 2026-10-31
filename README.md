# folio.

A multilingual investment portfolio tracker built with TanStack Start, React, TypeScript, Supabase, and Tailwind CSS.

## Development

Use Node.js 24 and npm 12. Install the exact dependency versions from the committed npm lockfile:

```sh
npm ci
npm run dev
```

Useful checks:

```sh
npm run typecheck
npm test
npm run build
```

GitHub Actions runs type-checking, tests, and the production build for pushes and pull requests. The repository-wide lint command currently reports pre-existing formatting and lint errors, so it is not yet a CI gate. npm is the supported package manager; update `package-lock.json` with npm when dependencies change.

## Services and deployment

The app uses Supabase Auth directly for email/password and OAuth sign-in, OpenAI directly for AI features, and Creem for billing. Cloudflare Workers is the configured deployment target.

Configure Supabase OAuth providers and redirect URLs in the Supabase dashboard. Confirm that you own or control the current Supabase project before changing it; this code change does not move user accounts, portfolio rows, or avatar files.

Copy `.env.example` to `.env` for public build-time values, and `.dev.vars.example` to `.dev.vars` for local server secrets. Never commit populated env files. Set the same values as Worker secrets or variables in Cloudflare:

- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`
- `BROKER_CREDENTIALS_ENCRYPTION_KEY` (32 random bytes, base64-encoded; required for direct broker connections)
- `OPENAI_API_KEY`; optionally `OPENAI_MODEL` (defaults to `gpt-5.4`)
- `CREEM_MODE` (`test` locally or `prod` in production), `CREEM_API_KEY`, `CREEM_WEBHOOK_SECRET`, `CREEM_PRODUCT_ID_MONTHLY`, and `CREEM_PRODUCT_ID_YEARLY`
- `PUBLIC_APP_URL` (for example `http://localhost:8080` locally and `https://capispot.com` in production)
- `CRON_SECRET` and optionally `CRON_SECRET_PREVIOUS` for protected scheduled routes
- `DATABASE_URL` for Drizzle migration commands only
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_CREEM_MODE` (`test` for previews/test builds, `prod` for the live site) as build-time public variables

Configure the Google provider in Supabase with the web OAuth client ID and secret; browser sign-in uses Google's Identity Services and exchanges its ID token with Supabase. Keep `https://capispot.com` in that Google client’s authorized JavaScript origins (add the local development origin only when testing locally). The client ID is public and is used by the sign-in button; never expose the client secret. Configure Apple OAuth and the Supabase redirect allow-list for email confirmation and password reset. In Creem, create two recurring products (monthly and yearly), enable a 5-day free trial with no trial charge, set tax mode to inclusive, copy their product IDs into `CREEM_PRODUCT_ID_MONTHLY` and `CREEM_PRODUCT_ID_YEARLY`, and configure a webhook to `https://capispot.com/api/public/payments/webhook` with the `checkout.completed`, `subscription.trialing`, `subscription.paid`, `subscription.active`, `subscription.scheduled_cancel`, `subscription.canceled`, and `subscription.expired` events. Store the webhook signing secret in `CREEM_WEBHOOK_SECRET`.

Use Creem Test Mode and test API credentials before switching Cloudflare to the production API key, products, webhook secret, and `CREEM_MODE=prod`. Test-mode webhooks are acknowledged but do not write subscription access or referral rewards. Configure the matching `VITE_CREEM_MODE` before building (`test` locally, `prod` for the live site). Use `npm run deploy` only after configuring the Cloudflare account, Creem settings, environment variables, Supabase OAuth redirect allow-list, and applying the database migrations. It deploys the Worker; it does not migrate the Supabase database or change provider dashboards. OpenAI receives the portfolio or company data needed to answer each AI request; review its privacy and retention terms for your account before enabling the feature for users.

## Referral rewards and analytics setup

Apply `drizzle/migrations/0009_referrals_and_analytics.sql`, `drizzle/migrations/0010_account_management.sql`, `drizzle/migrations/0012_creem_billing.sql`, and `drizzle/migrations/0013_owner_admin_access.sql` to the connected Supabase database before enabling referrals, account deletion, Creem billing, or the owner console. Referral rewards are issued only after a live, signature-verified Creem checkout is matched to its subscription record. Test-mode payments never grant rewards.

Apply `drizzle/migrations/0014_onboarding_analytics_funnel.sql` before enabling the expanded onboarding analytics events, and `drizzle/migrations/0015_transaction_fees_and_bonds.sql` before using transaction fees or bonds. Apply migrations to the intended Supabase project before deploying code that depends on them.

Apply `drizzle/migrations/0016_direct_broker_connections.sql` before enabling direct IBKR or Trading 212 connections. Set a unique `BROKER_CREDENTIALS_ENCRYPTION_KEY` as a local `.dev.vars` value and Cloudflare Worker secret; generate it from 32 random bytes and base64-encode it. The app stores only AES-GCM-encrypted broker credentials in a service-role-only table. Trading 212 connections use the official API and require a read-only key with portfolio, order-history, and dividend-history permissions. IBKR connections use Flex Web Service; users need a Flex Query with Trades and dividend cash transactions. IBKR report tokens expire and must be renewed by the user. Broker sync is read-only and imports executions/dividends, never orders or deposits/withdrawals.

### Owner console setup

After applying `0013_owner_admin_access.sql`, provision the existing owner account once in the Supabase SQL Editor. Replace the placeholder with the email of the owner account that already exists in `auth.users`; this inserts only that account as a site admin and grants permanent Pro access. The console exposes aggregate account/subscription counts and Pro status by email, but never other users' portfolios or messages.

```sql
DO $$
DECLARE
  owner_id uuid;
BEGIN
  SELECT id INTO owner_id
  FROM auth.users
  WHERE lower(email) = lower('replace-with-owner-email');

  IF owner_id IS NULL THEN
    RAISE EXCEPTION 'Owner account was not found';
  END IF;

  INSERT INTO public.site_admins (user_id)
  VALUES (owner_id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.pro_access_grants (user_id, granted_by)
  VALUES (owner_id, owner_id)
  ON CONFLICT (user_id) WHERE revoked_at IS NULL DO NOTHING;
END $$;
```

Sign out and back in after provisioning. The owner console then appears in the account menu and is also available at `/admin`.

First-party analytics are opt-in. The app stores only allowlisted event names and a random session ID, without account IDs, emails or portfolio data; events older than 90 days are removed as new events are recorded. Users can change their consent from the Privacy Policy page.

Account and billing tools require configured Creem API credentials and a Supabase service-role key. The account portal creates a Creem customer portal link. If account deletion is requested while Pro access is active, the app schedules cancellation and keeps the account and data available through the current paid period; the user can return afterward to delete the account. It does not refund the current paid period. If Creem cancellation or data cleanup fails, account deletion stops and reports an error.

Add `/features` to the public sitemap when one is configured. The feature page is static and available in all supported app languages.

To review the conversion funnel in the Supabase SQL editor, run:

```sql
select
  count(distinct session_id) filter (where event_name = 'pricing_view') as pricing_sessions,
  count(distinct session_id) filter (where event_name = 'signup_completed') as signups,
  count(distinct session_id) filter (where event_name = 'first_holding_added') as first_holdings,
  count(distinct session_id) filter (where event_name = 'checkout_started') as checkout_starts,
  count(distinct session_id) filter (where event_name = 'checkout_completed') as completed_checkouts
from public.analytics_events
where created_at >= now() - interval '30 days';
```
