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

The app uses Supabase Auth directly for email/password and OAuth sign-in, OpenAI directly for AI features, and the Paddle API directly for billing. Cloudflare Workers is the configured deployment target.

Configure Supabase OAuth providers and redirect URLs in the Supabase dashboard. Confirm that you own or control the current Supabase project before changing it; this code change does not move user accounts, portfolio rows, or avatar files.

Copy `.env.example` to `.env` for public build-time values, and `.dev.vars.example` to `.dev.vars` for local server secrets. Never commit populated env files. Set the same values as Worker secrets or variables in Cloudflare:

- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`; optionally `OPENAI_MODEL` (defaults to `gpt-5.4`)
- `PADDLE_SANDBOX_API_KEY`, `PADDLE_LIVE_API_KEY`, `PAYMENTS_SANDBOX_WEBHOOK_SECRET`, and `PAYMENTS_LIVE_WEBHOOK_SECRET`
- `CRON_SECRET` and optionally `CRON_SECRET_PREVIOUS` for protected scheduled routes
- `DATABASE_URL` for Drizzle migration commands only
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_PAYMENTS_CLIENT_TOKEN` as build-time public variables

Configure Google and Apple OAuth providers and the production redirect allow-list in Supabase. Configure Paddle webhook endpoints to `/api/public/payments/webhook?env=live` and `?env=sandbox` as appropriate, with the matching signing secrets.

Use `npm run deploy` only after configuring the Cloudflare account, environment variables, Supabase OAuth redirect allow-list, and Paddle webhook URLs. It deploys the Worker; it does not migrate the Supabase database or change provider dashboards. OpenAI receives the portfolio or company data needed to answer each AI request; review its privacy and retention terms for your account before enabling the feature for users.

## Referral rewards and analytics setup

Apply `drizzle/migrations/0009_referrals_and_analytics.sql` and `drizzle/migrations/0010_account_management.sql` to the connected Supabase database before enabling referrals or account deletion. In Paddle, subscribe the production webhook to `transaction.completed` in addition to the subscription lifecycle events; referral rewards are issued only after a live subscription payment is matched to its verified subscription record. Sandbox payments never grant rewards.

First-party analytics are opt-in. The app stores only allowlisted event names and a random session ID, without account IDs, emails or portfolio data; events older than 90 days are removed as new events are recorded. Users can change their consent from the Privacy Policy page.

Account and billing tools require configured Paddle API keys for each environment and a Supabase service-role key. The account portal creates a short-lived Paddle customer portal session. If account deletion is requested while Pro access is active, the app cancels renewal but keeps the account and data available through the current paid period; the user can return afterward to delete the account. It does not refund the current paid period. If Paddle cancellation or data cleanup fails, account deletion stops and reports an error.

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
