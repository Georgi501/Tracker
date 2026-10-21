<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- User portfolio rows are RLS-scoped in Cloud; only preferences persist locally. Transaction costs are stored in USD; display FX must come from the market provider, never fixed rates.
- PortfolioProvider renders children only after mount, to avoid SSR hydration mismatches from locale/time-dependent output.
- Signed-out visitors see an empty portfolio; signed-in users read/write their own rows (RLS by user_id). Broker limits remain enforced by the is_pro() database trigger.
- Live quotes use shared server-only yahoo-finance2 chart metadata for stocks/ETFs and direct CoinGecko crypto data; missing quotes remain unavailable and are never replaced by transaction costs.
- Historical portfolio valuation replays actual dated transactions against provider daily closes and dated FX in the selected base currency; missing data and unreconciled stock splits suppress the chart instead of fabricating points. Dividend forecasts require confirmed event data.
- Crypto history uses CoinGecko only within its 365-day free-API cap and Yahoo's USD pair beyond it, so one provider backs each chart instead of a stitched mix.

- The i18n language registry is the single source for language selection, persisted preference validation and Intl locales; each supported language supplies a complete typed dictionary.
- Asset discovery uses public read-only TanStack server functions with Yahoo search and shared quote helpers; authenticated portfolio quotes use the same provider layer, refresh every minute, and never expose account data.

- CSV parsing preserves original transaction currency and auto-detects broker headers; authenticated conversion uses dated Yahoo EURUSD/GBPUSD closes, official historical lev parity and GBX penny scaling before storing USD costs.
- Benchmark comparison aligns index closes to the actual portfolio dates, converts both into the selected base currency with dated FX, and plots zero-based cash-flow-adjusted portfolio returns against explicitly labeled index price returns; missing data suppresses comparison rather than substituting prices.
- Benchmark selection is a validated local preference restored after mount, so it survives visits without storing private portfolio data or creating hydration mismatches.
- Investor tools (FIFO tax, buy-only rebalancing, risk metrics) are pure functions in src/lib/tools.ts with tests; risk uses only real flow-adjusted daily history.
- Watchlist is a local preference (tickers only, restored after mount); dividend data comes only from confirmed Yahoo events, never estimates.
- Pro access is granted only by signature-verified payment webhooks writing public.subscriptions; is_pro() is the single entitlement check used by the UI and the broker-limit trigger.
- AI Advisor streams via the /api/advisor server route: verifies the bearer, requires is_pro(), loads the user's portfolio through RLS, and persists UIMessage parts per thread (ai_threads/ai_messages).
- Pro-only sections use ProGate (src/components/ProFeatures.tsx): free users see a blurred, number-free silhouette with an upgrade link; never preview with fabricated figures.
- Investment goals are stored per user in public.goals (RLS by user_id) so they follow the account across devices; projections are pure helpers in src/lib/insights.ts.
- Feedback is submitted through an authenticated server function using a shared validation schema and stored with owner-scoped RLS; no public feedback reads, to protect messages.
- Asset search provides immediate catalog matches and debounced provider results with stale-response guards, to suggest assets while typing without flooding the provider.
- Watchlist and price alerts are local preferences in src/lib/watchlist.ts (tickers/targets only), synced across components via a window event; alerts fire only on real quotes.
- Home-screen install is manifest-only (no service worker), to avoid stale caches in preview.
- Community (profiles with photo, member directory, opt-in portfolio showcase as cost-weight percentages via public_portfolio(), 1:1 realtime chat in direct_messages) is enforced Pro-only in RLS via is_pro() and in UI via CommunityUpsell; avatars sit in a private bucket served by signed URLs because public buckets are blocked.
- Investing journal notes live in public.journal_notes (RLS by user_id, one row per symbol) so theses follow the account; snapshots share only class percentages to protect privacy.
