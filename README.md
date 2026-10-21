# Welcome to your Lovable project

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS

## Referral rewards and analytics setup

Apply `drizzle/migrations/0009_referrals_and_analytics.sql` to the connected Supabase database before enabling the referral program. In Paddle, subscribe the production webhook to `transaction.completed` in addition to the subscription lifecycle events; referral rewards are issued only after a live subscription payment is matched to its verified subscription record. Sandbox payments never grant rewards.

First-party analytics are opt-in. The app stores only allowlisted event names and a random session ID, without account IDs, emails or portfolio data; events older than 90 days are removed as new events are recorded. Users can change their consent from the Privacy Policy page.

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
