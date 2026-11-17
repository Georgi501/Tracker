# CapiSpot — Comprehensive Codebase Audit & Optimization Review

**Audit Date:** 2026-11-17  
**Baseline Commit:** `41bf005e1764fd4a44319f1b9dd0a5439abc116b` (`main` / `origin/main`)  
**Scope:** Read-only full-stack audit (`src/`, `drizzle/migrations/`, `supabase/`, `.github/workflows/`, `wrangler.jsonc`, `vite.config.ts`, `package.json`). No source files, schemas, or configurations were modified.

---

## 1. Executive Summary

CapiSpot is a feature-rich, multilingual (5 languages: `en`, `bg`, `de`, `es`, `it`) investment portfolio tracking and analytics platform built on **TanStack Start / Router**, **React**, **TypeScript**, **Supabase** (PostgreSQL + RLS + Storage + Auth), and **Cloudflare Workers**.

### Overall Verdict
The codebase has **strong foundational engineering** in several critical areas—most notably SEC EDGAR 10-K financial parsing, Creem webhook HMAC-SHA256 verification, AES-256-GCM broker credential encryption, strict client/server bundle isolation (`yahoo-finance2` and `*.server.ts` never leak to the client), and a solid automated test suite (**101 test files / 640 tests passing**).

However, rapid feature growth across multiple iterations has introduced **6 P0 (Critical)** issues (4 in financial calculation accuracy and 2 in Supabase/Worker security), **9 P1 (High-Priority)** issues (performance bottlenecks, React re-render cascades, RLS/storage scoping gaps, FX inconsistencies, and SEO crawler bugs), and significant **P2/P3** technical debt (duplicated components/utilities, 38 unused UI primitives, 26 unused `package.json` dependencies, and 1,000–1,600 line monolithic files).

---

## 2. Overall Codebase Health Assessment

| Dimension | Rating | Summary |
| :--- | :--- | :--- |
| **Financial Data Accuracy** | **Needs Immediate Attention** | SEC EDGAR, DCF, and daily attribution are rigorous, but multi-split history, EUR-vs-USD TWR/IRR comparison, EUR `assetContributions` FX translation, and `riskMetrics` annualization contain confirmed bugs. |
| **Security & Supabase RLS** | **Good Core, Specific Gaps** | Webhook HMAC, AES-256-GCM broker secrets, open-redirect guards, and XSS escaping are sound. Gaps exist in `is_pro(uuid)` `PUBLIC` execute privilege, unthrottled `/api/public/analytics`, and overly broad `profiles`/`avatars`/`wall_comments` RLS policies. |
| **Performance & Bundle** | **Moderate** | Cloudflare Edge Cache and `dailyHistory` in-flight dedup are strong, but `PortfolioProvider` 60s ticks, `usePositionDeletion` 1s unconditional timer, $O(D \times A \times P)$ `closeAt` scans, 3-step data waterfalls, and eager `recharts` on `/` degrade responsiveness. |
| **Architecture & DRY** | **Moderate** | Clear `*.server.ts` / `*.functions.ts` separation, but undermined by 1,000+ line monoliths, duplicate `ShareAllocationButton` / `CompanyLogo` / `Add|EditTransactionDialog` components, 60+ inline `Intl.NumberFormat` calls, and 38 dead `ui/*` files. |
| **SEO, i18n & Mobile UX** | **Good Foundation, Specific Bugs** | 5-language dictionaries exist, but several components fall back to `bg` vs `en` only; `robots.txt` bot blocks bypass `User-agent: *` disallows; `/api/og` returns SVG; mobile "More" nav (`mobileMoreGroups`) is computed but unrendered. |
| **Testing & CI/CD** | **Strong Tests, Incomplete CI** | `typecheck` (0 errors), `vitest` (640/640 passed), `eslint` (0 errors, 3 warnings), and `vite build` all pass. CI workflow omits `npm run lint` and 3 API routes / 16 `src/lib/` modules lack direct tests. |

---

## 3. Critical and High-Priority Findings

### P0 — Critical

#### [P0-1] Multi-Split History Corruption in `hasPositionBefore`
1. **Problem:** `hasPositionBefore` checks whether a user held shares before a split date using raw, unadjusted transaction quantities instead of split-adjusted quantities.
2. **Location:** `src/lib/history.functions.ts:123-163` (`getPortfolioHistory` → `hasPositionBefore`)
3. **Evidence:**
   ```ts
   const hasPositionBefore = (assetId: string, date: string) => {
     let quantity = 0;
     for (const transaction of txs) {
       if (transaction.assetId !== assetId || transaction.date >= date) continue;
       if (transaction.kind === "buy") quantity += transaction.quantity;
       else if (transaction.kind === "sell") quantity -= transaction.quantity;
     }
     return quantity > 1e-9;
   };
   ```
4. **Why it matters:** If a user buys 1 share, goes through a 4:1 split (holding 4), and sells 2 shares before a second 2:1 split, `hasPositionBefore` computes `1 - 2 = -1 <= 1e-9` and returns `false`. Both `pendingSplits` and `confirmedSplits` drop the second split, corrupting historical portfolio values and `dailyAttribution`.
5. **Recommended solution:** Replay splits chronologically and multiply accumulated `quantity` by each earlier split's `ratio` before evaluating `quantity > 1e-9` for subsequent splits.
6. **Expected benefit:** Accurate historical valuations and split reconciliation for multi-split equities (e.g., NVDA, AAPL, TSLA).
7. **Regression risk:** Low (isolated to `hasPositionBefore` with clear unit-testable inputs).
8. **Estimated effort:** Small.

#### [P0-2] Currency Mismatch Between TTWROR (`EUR`/`USD`) and IRR (Always `USD`)
1. **Problem:** When the user selects `EUR` as display currency, `TTWROR` is calculated from `EUR`-converted portfolio history while `IRR` (`portfolioIrr`) is always calculated in `USD` and compared side-by-side in `twrIrrDeltaSummary`.
2. **Location:** `src/routes/index.tsx:617-618` (`portfolioMetrics`), `src/lib/portfolio.ts:438-457` (`portfolioIrr`), `src/lib/benchmark.ts:29-49` (`twrIrrDeltaSummary`), `src/lib/history.functions.ts:171-180`
3. **Evidence:** `portfolioIrr(transactions, total)` takes USD transaction cash flows and USD `total`, whereas `getPortfolioHistory` converts `points` to `data.currency` (`EUR` or `USD`) before `historyReturn(series)` computes TTWROR.
4. **Why it matters:** Comparing a EUR-denominated TTWROR (which includes USD/EUR FX moves) against a USD-denominated IRR produces misleading money-weighted vs. time-weighted return deltas for European investors.
5. **Recommended solution:** Compute `portfolioIrr` using cash flows and terminal value converted into the selected display currency using the same dated FX rates (`eurUsd` / `gbpUsd`) and current live FX rate, or explicitly pass `currency` into `portfolioIrr`.
6. **Expected benefit:** Apples-to-apples TWR vs. IRR comparison in every supported display currency.
7. **Regression risk:** Medium (requires aligning dated FX lookup in `portfolioIrr` with `history.functions.ts`).
8. **Estimated effort:** Medium.

#### [P0-3] `assetContributions` in `EUR` Mode Omits Prior-Day FX Translation
1. **Problem:** `buildPortfolioHistory` computes per-asset daily contributions in USD and divides by today's `baseRate`, omitting the FX translation gain/loss on `previousValues` between yesterday's and today's `baseRate`.
2. **Location:** `src/lib/history.ts:159-169` (`buildPortfolioHistory`)
3. **Evidence:**
   ```ts
   const dailyContribution =
     ((values.get(asset.id) ?? 0) -
       (previousValues.get(asset.id) ?? 0) -
       (assetFlows.get(asset.id) ?? 0)) /
     baseRate;
   ```
4. **Why it matters:** The sum of `assetContributions` does not reconcile to the portfolio's total EUR P&L (unlike `dailyAttribution` in `src/lib/performance-attribution.ts:107`, which computes `q * p1 * (r1 / baseNow - r0 / basePrior)`).
5. **Recommended solution:** Convert `previousValues` using `previousBaseRate` (`values / baseRate - previousValues / previousBaseRate - assetFlows / baseRate`).
6. **Expected benefit:** Exact reconciliation between per-asset contributions and total portfolio EUR returns.
7. **Regression risk:** Low.
8. **Estimated effort:** Small.

#### [P0-4] `riskMetrics` Understates Volatility (`sqrt(365)` on Calendar Days) and Allows `< -100%` Drawdown
1. **Problem:** `riskMetrics` computes daily returns across a calendar-day series (where weekends have `0%` carry-forward returns), scales by `sqrt(365)`, and lacks a guard for `b.v - b.flow < 0`.
2. **Location:** `src/lib/tools.ts:378-407` (`riskMetrics`)
3. **Evidence:**
   - Line 384: `rets.push((b.v - b.flow) / a.v - 1);` (no guard when `b.v - b.flow < 0`, unlike `historyReturn` in `src/lib/history.ts:187`).
   - Lines 397-398: `const vol = sd * Math.sqrt(365); const annual = mean * 365;` (whereas `assetRiskAnalysis` at `src/lib/tools.ts:185` uses `252`).
4. **Why it matters:** ~104 zero-return weekend days per year dilute standard deviation, understating annualized volatility by ~17% (`1 - sqrt(252/365)`). Furthermore, an intraday withdrawal exceeding remaining value (`b.v - b.flow < 0`) yields `r < -1`, flipping `idx *= 1 + r` negative and producing impossible `maxDrawdown < -100%`.
5. **Recommended solution:** Filter out non-trading weekend days (or match trading-day convention `252`), and guard `b.v - b.flow <= 0` / clamp `1 + r` as in `historyReturn`.
6. **Expected benefit:** Mathematically valid Sharpe/volatility/drawdown metrics consistent with `assetRiskAnalysis`.
7. **Regression risk:** Low–Medium (existing risk metric snapshot/unit expectations may shift to accurate values).
8. **Estimated effort:** Small.

#### [P0-5] `public.is_pro(_user_id uuid)` Callable by `PUBLIC` / `anon` (Pro-Status Oracle)
1. **Problem:** `is_pro(_user_id uuid)` is `SECURITY DEFINER` and never revokes `EXECUTE` from `PUBLIC` or `anon`.
2. **Location:** `drizzle/migrations/0000_portfolio_schema.sql:38-40`, `drizzle/migrations/0013_owner_admin_access.sql:39-59`
3. **Evidence:** Unlike `is_site_admin()`, `claim_referral_code()`, and `public_portfolio()`, no migration runs `REVOKE EXECUTE ON FUNCTION public.is_pro(uuid) FROM PUBLIC, anon;`.
4. **Why it matters:** PostgreSQL grants `EXECUTE` on new functions to `PUBLIC` by default. Any anonymous or authenticated user can call `/rest/v1/rpc/is_pro` with any UUID to enumerate which users have active Pro subscriptions or admin/referral grants.
5. **Recommended solution:** Add a migration revoking `EXECUTE` on `public.is_pro(uuid)` from `PUBLIC` and `anon`, and either restrict direct RPC calls to `auth.uid() = _user_id` or expose a zero-argument `is_pro()` wrapper for client RPCs while keeping `is_pro(uuid)` internal to RLS policies. *(Verify live Supabase `pg_proc` ACLs before applying.)*
6. **Expected benefit:** Eliminates user subscription enumeration via Supabase REST RPC.
7. **Regression risk:** Low (verify all client/server callers only check the current user's own `is_pro`).
8. **Estimated effort:** Small.

#### [P0-6] Unthrottled `POST /api/public/analytics` Can Exhaust Global Analytics Quota
1. **Problem:** `POST /api/public/analytics` is unauthenticated and excluded from Cloudflare Worker rate limiting, yet writes to PostgreSQL and shares a global 1,000 events/minute cap.
2. **Location:** `src/server.ts:84-100` (`RATE_LIMITED_PATHS`), `src/routes/api/public/analytics.ts:44-76`, `drizzle/migrations/0031_onboarding_page_analytics.sql:37-90` (`record_analytics_event`)
3. **Evidence:** `RATE_LIMITED_PATHS` only covers `["/api/advisor", "/api/thesis", "/api/review"]`. Inside `record_analytics_event`, `count(*) >= 1000` in the last minute across *all* sessions returns `false` (HTTP 429).
4. **Why it matters:** A single script rotating `sessionId` UUIDs at >1,000 req/min can trigger 1,000+ DB writes/min and silently drop all legitimate onboarding/product analytics across the entire platform.
5. **Recommended solution:** Add Cloudflare rate-limiting (`AI_LIMITER` or a dedicated IP-based limiter) to `/api/public/analytics` in `src/server.ts` and enforce per-IP throttling before hitting Supabase.
6. **Expected benefit:** Protects Supabase DB write capacity and prevents global analytics denial-of-service.
7. **Regression risk:** Low.
8. **Estimated effort:** Small.

---

### P1 — High Priority

#### [P1-1] `getPortfolioHistory` Assumes `txs[0]` Is Chronologically Earliest Without Sorting
- **Location:** `src/lib/history.functions.ts:40-67`
- **Evidence:** `const first = txs[0]?.date ?? end;` reads index `0` directly from `portfolio_snapshot` output without sorting `txs` by `date`.
- **Why it matters:** Backdated transactions added after newer ones can cause `txs[0]` to be a later date, truncating `start` and `fetchStart` and omitting earlier history.
- **Recommended solution:** Sort `txs` by `date` ascending (or compute `min(tx.date)`) before deriving `first`.
- **Expected benefit:** Guaranteed full-history start date regardless of DB row order.
- **Regression risk:** Low. **Effort:** Small.

#### [P1-2] `irr` / `portfolioIrr` Returns `null` for Short Holding Periods Above `+1000%` Annualized
- **Location:** `src/lib/portfolio.ts:401-436` (`irr`)
- **Evidence:** Bisection brackets `lo = -0.99, hi = 10` and returns `null` if `Math.sign(loValue) === Math.sign(hiValue)`.
- **Why it matters:** A +5% gain over 1 day or +10% over 1 week annualizes above 1,000% (`hi = 10`), causing IRR to display as unavailable (`null`) for newly funded portfolios.
- **Recommended solution:** Dynamically expand `hi` (e.g., doubling up to `1e6` or returning `null`/capped notice for < 7–14 day holding periods where annualized IRR is mathematically explosive).
- **Expected benefit:** Eliminates unexpected `null` IRR values on short-duration portfolios.
- **Regression risk:** Low. **Effort:** Small.

#### [P1-3] $O(D \times A \times P)$ Linear Scan + `Date.parse()` Hot Loop in `buildPortfolioHistory`
- **Location:** `src/lib/history.ts:60-68, 92-179` (`closeAt`, `buildPortfolioHistory`)
- **Evidence:** Outer loop iterates every calendar day (~1,825+ for `5Y`/`ALL`), inner loop iterates every asset, and `closeAt` scans `prices` from index `0` calling `Date.parse()` on every hit.
- **Why it matters:** A 30-asset portfolio over 5 years executes ~$6.8 \times 10^7$ loop iterations per request, risking Cloudflare Worker CPU timeouts.
- **Recommended solution:** Because `date` is strictly monotonic in the outer loop, maintain a forward-moving cursor index per asset and per FX series, and pre-parse date timestamps once. This reduces `closeAt` from $O(P)$ to **$O(1)$ amortized**.
- **Expected benefit:** Order-of-magnitude reduction in server CPU time for `getPortfolioHistory`.
- **Regression risk:** Low (pure algorithmic speedup; identical output). **Effort:** Small.

#### [P1-4] `PortfolioProvider` Monolithic Context & Unstable `p.transactions` Query Keys
- **Location:** `src/lib/PortfolioProvider.tsx:438-579, 632-1044`, `src/lib/store.ts:91`, `src/routes/index.tsx:623-628`, `src/routes/analytics.tsx:211-216`
- **Evidence:** `reload()` runs every 60s and updates `dataUpdatedAt = Date.now()` plus 6 separate `setState` calls even when quotes/data haven't changed. `Dashboard` and `Analytics` use `queryKey: ["portfolio-history", p.user?.id, p.transactions, ...]`—because `p.transactions` is a new array reference every 60s, `getPortfolioHistory` refetches every minute.
- **Why it matters:** Every 60s, every `usePortfolio()` consumer (`AppShell`, `HeaderSearch`, `CommandMenu`, monitors, active route) re-renders and `getPortfolioHistory` hits the server redundantly.
- **Recommended solution:** Split `Ctx` into stable Actions/Preferences vs. Data, skip `setState` when quote values/timestamps are unchanged, and key `portfolio-history` on a stable transaction fingerprint (count + latest tx ID/date) rather than array identity.
- **Expected benefit:** Eliminates unnecessary 60s full-app re-renders and redundant `getPortfolioHistory` server round-trips.
- **Regression risk:** Medium (affects core provider; test thoroughly). **Effort:** Medium.

#### [P1-5] 3-Step Data-Fetching Waterfall, 6x `MarketTicker` POSTs & Uncapped `getSparklines`
- **Location:** `src/routes/index.tsx:623-647`, `src/routes/analytics.tsx:211-326`, `src/components/MarketTicker.tsx:82-89`, `src/lib/sparklines.functions.ts:25-34`
- **Evidence:**
  1. `PortfolioProvider` (`getSession` → `portfolio_snapshot`) → enables `getPortfolioHistory` → resolves `first`/`last` → enables `getBenchmarkHistory`.
  2. `MarketTicker` dispatches 6 simultaneous `marketQuote` POSTs (including `EURUSD=X`, already fetched by `PortfolioProvider`).
  3. `getSparklines` executes `Promise.all(data.items.map(...))` for up to 40 symbols with no batch cap.
- **Recommended solution:** Derive benchmark `start`/`end` from `p.transactions` immediately once `portfolioReady` is true; batch `MarketTicker` into 1 server call; cap `getSparklines` with `mapInBatches(..., 5)`.
- **Expected benefit:** Faster Dashboard/Analytics chart paint and lower Yahoo/Worker subrequest pressure.
- **Regression risk:** Low. **Effort:** Small–Medium.

#### [P1-6] Unconditional 1-Second `setInterval` in `usePositionDeletion`
- **Location:** `src/hooks/use-position-deletion.ts:98-109` (used in `src/routes/holdings.tsx:718`)
- **Evidence:** `setInterval(() => update((value) => value + 1), 1000)` runs every second whenever `userId` is truthy, even when `operations.current.size === 0`.
- **Why it matters:** Forces `Holdings` (table, sorting, `AllocationCard`, `Sparkline`s) to re-render every 1,000ms continuously while the user views `/holdings`.
- **Recommended solution:** Only start the 1s interval when at least one operation is in `phase === "deleted"` with an active `deadlineAt`.
- **Expected benefit:** Eliminates idle CPU/battery drain and continuous re-renders on `/holdings`.
- **Regression risk:** Low. **Effort:** Small.

#### [P1-7] Overly Broad RLS & Storage Policies (`profiles`, `avatars`, `wall_comments`, `wall_reactions`)
- **Location:**
  - `drizzle/migrations/0007_community_pro_only.sql:2` & `0009_referrals_and_analytics.sql:1-2` (`profiles`)
  - `drizzle/migrations/0005_community_profiles_chat.sql:29` (`storage.objects` `avatars`)
  - `drizzle/migrations/0022_wall_follows_blocks_moderation.sql:54-56` (`wall_comments`)
  - `drizzle/migrations/0018_community_wall_and_share_levels.sql:99-100` (`wall_reactions`)
- **Evidence:**
  - `public.profiles` `SELECT` is table-level, exposing `referral_code`, `lang`, and `currency` of any `is_public = true` user to all Pro members.
  - `avatars` `SELECT` allows any `authenticated` user (even free tier) to read any avatar object by path.
  - `wall_comments` and `wall_reactions` `SELECT` policies do not check that the parent `wall_posts` row has `hidden_at IS NULL` or is not from a blocked author.
- **Recommended solution:** Move `referral_code` to a private owner-only table/view or restrict column `SELECT`; gate `avatars` `SELECT` on `is_pro(auth.uid())` or `auth.uid()`; add `EXISTS (SELECT 1 FROM public.wall_posts wp WHERE wp.id = post_id AND wp.hidden_at IS NULL AND NOT public.wall_blocked(wp.user_id))` to `wall_comments`/`wall_reactions` `SELECT`.
- **Expected benefit:** Tighter privacy boundaries across Community and Referral data.
- **Regression risk:** Low–Medium (verify Community directory and Wall queries still return expected columns). **Effort:** Medium.

#### [P1-8] Live Quote Currency Support Gaps (`JPY`/`CHF`/`CAD`/`BGN`) & `NaN` Flash in `currentUsdPrice`
- **Location:** `src/lib/quotes.functions.ts:47-57`, `src/lib/ai-portfolio.server.ts:25-44`, `src/lib/live-fx.ts:56-62`, `src/lib/PortfolioProvider.tsx:206`
- **Evidence:** Live quote conversion only handles `USD`, `EUR`, `GBP`, `GBX`, `GBp` (dropping `JPY`, `BGN`, `CHF`, `CAD`, etc. as `missing`), even though `currencyRate` in `history.ts` supports `JPY` and `BGN`. On the client, `currentUsdPrice` returns `Number.NaN` for `EUR`-quoted assets if `liveFx` is `null` before `getExchangeRate` resolves.
- **Recommended solution:** Fallback to the last quote-derived USD price when `liveFx` is `null`, and support `JPY`/`BGN`/`CHF`/`CAD` live FX pairs consistently with `history.ts`.
- **Expected benefit:** Prevents transient `NaN` portfolio totals on initial mount and supports non-USD/EUR/GBP holdings in live quotes.
- **Regression risk:** Low. **Effort:** Medium.

#### [P1-9] SEO Crawler & Social Preview Bugs (`robots.txt`, SVG `og:image`, Canonical/Hreflang)
- **Location:**
  - `public/robots.txt:1-21`
  - `src/routes/api/og.ts:16-23`
  - `src/routes/__root.tsx:255,295-298`
  - `src/routes/asset.$symbol.tsx:65-98`
  - `src/routes/etf-overlap.tsx:255-295`
  - `src/lib/seo.ts:47,66,77`
- **Evidence:**
  1. `public/robots.txt` defines `User-agent: Googlebot` / `Bingbot` / `Twitterbot` / `facebookexternalhit` with `Allow: /`. Per the robots.txt spec, bots ignore `User-agent: *` once a specific block matches—so Googlebot/Bingbot are *not* blocked from `/holdings`, `/analytics`, `/advisor`, `/account`, `/api/`, or `/admin`.
  2. `/api/og` returns `image/svg+xml`, which X/Twitter, Facebook, LinkedIn, Slack, and WhatsApp do not render as `og:image`.
  3. `__root.tsx` strips the trailing slash on `"/"` (`https://capispot.com`) while `hreflangLinks` and `sitemap.xml` emit `https://capispot.com/`.
  4. `etf-overlap.tsx` emits a duplicate `canonicalLink("/etf-overlap")` alongside `__root.tsx`, hardcodes English `TITLE`/`DESCRIPTION`/`inLanguage: "en"` even when `?lang=` is set, and ignores `?etfs=VOO,QQQ` in canonical. `asset.$symbol.tsx` omits `canonicalLink` and `og:url`.
- **Recommended solution:** Remove the redundant per-bot `Allow: /` blocks in `robots.txt` (or repeat `Disallow` rules in each) and explicitly `Allow: /api/og`; convert `/api/og` to PNG/WebP (e.g., `@resvg/resvg-wasm` or Satori/CF Image) or serve static/raster fallback; unify canonical trailing-slash logic and localize `head()` metadata on `etf-overlap.tsx` and `asset.$symbol.tsx`.
- **Expected benefit:** Clean crawler indexing of public pages only, working social share cards, and consistent canonical/hreflang signals.
- **Regression risk:** Low (keep `sitemap.xml` and `asset-seo` tests green). **Effort:** Medium.

---

## 4. Duplicate and Redundant Code

| Category | Duplicated Files / Patterns | Consolidation Recommendation |
| :--- | :--- | :--- |
| **Allocation Sharing** | `src/components/ShareAllocationButton.tsx` (L73, canvas PNG, `en`/`bg` only) vs. `src/components/ShareAllocationModal.tsx` (also exports `ShareAllocationButton` L180, 5 langs, `/api/og`) vs. `src/components/SnapshotCard.tsx` (clipboard/CSV/print) | Unify into a single `ShareAllocation` component with 5-language support and optional PNG/OG/CSV actions. |
| **Company Logos** | `src/components/CompanyLogo.tsx` (L31) vs. `src/components/CompanySuggestionLogo.tsx` (L26, used only in `PopularCompanySuggestions.tsx:49`) | Add optional `opticalCrop?: boolean` prop to `CompanyLogo` and remove `CompanySuggestionLogo.tsx`. |
| **Mobile Bottom Nav** | `src/components/MobileBottomNavigation.tsx` (L55) vs. `src/components/PublicMobileNavigation.tsx` (L4), both mounted in `AppShell.tsx:1051,1058` | Extract shared bottom-bar container/styles or unify into mode-based `MobileBottomNavigation`. |
| **Transaction Dialogs** | `src/components/AddTransactionDialog.tsx` vs. `src/components/EditTransactionDialog.tsx` (identical Tailwind input strings, duplicate ISO date & future-date validation) | Extract shared `validateTransactionInput` / date helper; migrate `AddTransactionDialog` to `ui/dialog` + `ui/input`. |
| **`Intl.NumberFormat`** | 60+ ad-hoc inline `new Intl.NumberFormat(...)` instantiations (some passing `p.lang` instead of `languageLocale(p.lang)`) | Centralize `formatNumber`, `formatCurrency`, `formatPercent` in `src/lib/format.ts` using `languageLocale(lang)`. |
| **ISO Date Validation** | 11+ duplicate `YYYY-MM-DD` `toISOString().slice(0, 10)` round-trip validators across `src/lib/` and components | Add `toIsoDate` and `isValidIsoDate` to `src/lib/local-date.ts`. |
| **Blob File Downloads** | 8 copies of `URL.createObjectURL(new Blob(...))` + `<a download>` click + `revokeObjectURL` | Extract `downloadBlob(filename, blob)` / `downloadText(...)` helper. |
| **API Bearer + Pro Auth** | Repeated in `advisor.ts`, `thesis.ts`, `account/delete.ts`, `account/portal.ts`, `payments/checkout.ts`, `referrals/claim.ts` | Extract `requireApiAuth(request, { requirePro?: boolean })` helper. |
| **Obsolete / Dead Code** | `src/lib/portfolio-pagination.ts` (legacy, unused in prod); **38 unused `src/components/ui/*` files**; **26 unused runtime deps** in `package.json` (`@hookform/resolvers`, `@tanstack/router-plugin`, `date-fns`, 18 unused `@radix-ui/*`, `embla-carousel-react`, `input-otp`, `react-day-picker`, `react-hook-form`, `react-resizable-panels`, `vaul`) + `drizzle-orm` in `devDependencies` | Remove `portfolio-pagination.ts` (after confirming test migration), unused `ui/*` boilerplate, and unused `package.json` dependencies. |

---

## 5. Performance Optimization Opportunities

1. **Memoize Heavy Derived Computations in `Analytics`, `Dashboard`, and `AssetPage` (`P2`)**:
   - `src/routes/analytics.tsx:173-566` runs `returns`, `performanceCurve`, `benchmarkSeries`, `riskMetrics`, `calculatePortfolioExposures`, **5 `groupBy` passes** (lines 364-387 & 866-885), `accountValues`, and `analyticsReportCsv` directly in render. Wrap in `useMemo` and generate CSV/print report lazily on click.
   - Memoize `recentTransactions` (`src/routes/index.tsx:723-725`) and `txs`/`assetValuations` (`src/routes/asset.$symbol.tsx:481-491`).
2. **Code-Split `recharts`, `framer-motion`, `CommandMenu`, and Background Monitors (`P2`)**:
   - `src/routes/index.tsx` and `src/components/SamplePortfolioPreview.tsx` eagerly import `recharts` and `framer-motion` on `/`, even for signed-out visitors. Lazy-load chart components (`React.lazy` + `Suspense`) and replace simple hover-lift `DashboardMotion` transitions with CSS.
   - Lazy-load `CommandMenu` and signed-in monitors (`AllocationDriftMonitor`, `PortfolioReminderMonitor`, `PriceAlertMonitor`) in `AppShell.tsx:61-69`.
   - Add client `manualChunks` in `vite.config.ts` to isolate `recharts`/`d3-*`, `@supabase/supabase-js`, and `framer-motion`.
3. **Batch `assets` Inserts in `importTransactions` (`P2`)**:
   - `src/lib/PortfolioProvider.tsx:889-913` inserts new assets one-by-one inside a `for` loop. Batch into a single `.insert([...]).select("id, symbol")` call.
4. **In-Flight Deduplication & Singleton `YahooFinance` in `prices.server.ts` (`P2`)**:
   - `src/lib/prices.server.ts:13-37` instantiates `new YahooFinance(...)` on every call and only caches resolved values (unlike `history.server.ts`, which caches in-flight `Promise`s). Reuse one module-level instance and cache in-flight promises.
5. **Lazy `GBPUSD=X` in `getQuotes` & `DataStatus` Lazy Timer (`P2`)**:
   - `src/lib/quotes.functions.ts:31-35` always fetches `GBPUSD=X` even with zero GBP/GBX holdings.
   - `src/components/DataStatus.tsx:7-22` runs a global 60s timer and maps `quoteCoverage` even when `<details>` is collapsed.
6. **`QueryClient` Defaults (`P3`)**:
   - `src/router.tsx:6` uses `new QueryClient()` with default `refetchOnWindowFocus: true` and `retry: 3`, triggering unnecessary refetches on tab switches.

---

## 6. Security and Database Findings

### Confirmed Findings (Code & Migrations)
- **P0:** `public.is_pro(_user_id uuid)` callable by `PUBLIC`/`anon` (`drizzle/migrations/0000_portfolio_schema.sql:38-40`, `0013_owner_admin_access.sql:39-59`).
- **P0:** Unthrottled `POST /api/public/analytics` can exhaust global 1,000/min quota (`src/server.ts:84-100`, `src/routes/api/public/analytics.ts:44-76`, `0031_onboarding_page_analytics.sql:37-90`).
- **P1:** `profiles` RLS exposes `referral_code` / `lang` / `currency` to all Pro users (`0007_community_pro_only.sql:2`, `0009_referrals_and_analytics.sql:1-2`); `avatars` bucket `SELECT` policy allows any `authenticated` user (`0005_community_profiles_chat.sql:29`); `wall_comments`/`wall_reactions` `SELECT` policies omit parent post `hidden_at IS NULL` check (`0022_wall_follows_blocks_moderation.sql:54-56`, `0018_community_wall_and_share_levels.sql:99-100`).
- **P2:** Missing Cloudflare rate limits on `marketEarningsCalendar` (up to 100 symbols/req in `src/lib/market.functions.ts:709-789`), `getCorporateActions`/`getDividendEvents`/`getPortfolioSecFilings` (`src/lib/dividends.functions.ts:22-154`), and account/payment/admin API routes (`src/server.ts:84-90`).
- **P2:** `src/routes/api/advisor.ts:32-33` calls `await request.json()` without `try/catch` (malformed JSON causes 500) and skips `z.string().uuid()` validation on `threadId`.
- **P2:** N+1 `is_pro` RPC loop in `src/routes/api/admin.ts:56-63`; 11 `count` queries + 20k-row `transactions` scan in `src/routes/api/admin-insights.ts:102-113,218-231`; missing DB indexes on `analytics_events(event_name, created_at)`, `referrals(referrer_id)`, and `wall_reports(created_at)`.
- **P2:** Full `script-src`/`connect-src` CSP is `Content-Security-Policy-Report-Only` (`src/server.ts:54-70`); `requireSupabaseAuth` uses stateless `getClaims()` (`src/integrations/supabase/auth-middleware.ts:88`).

### Controls Verified Sound
- **XSS / HTML / SVG:** Zero `dangerouslySetInnerHTML` in `src/`; `og-svg.ts` uses `escapeXml` + `nosniff`; `analytics-report.ts` escapes HTML and neutralizes CSV formula injection (`/^\s*[=+\-@]/`).
- **Open Redirects & Webhooks:** `safeAuthContinuation` (`auth-i18n.ts:208`) and `isCreemUrl` (`creem.server.ts:127`) strictly constrain redirects; Creem webhook (`webhook.ts:216-222`, `creem.server.ts:104-125`) uses 1 MB body cap, constant-time HMAC-SHA256, and ignores `mode === "test"`.
- **Broker Secrets & SSRF:** AES-256-GCM with 32-byte key & random 12-byte IV (`broker-secrets.server.ts`); hardcoded `T212_BASE` and `IBKR_BASE` (`brokers.server.ts`); `SUPABASE_SERVICE_ROLE_KEY` strictly server-only.

### Requires Live Supabase / Cloudflare Verification
1. Confirm live `pg_proc` ACLs on `public.is_pro(uuid)` and `storage.objects` listing permissions on `avatars`.
2. Confirm `AI_LIMITER` binding, `CREEM_MODE=prod`, `CREEM_WEBHOOK_SECRET`, and `BROKER_CREDENTIALS_ENCRYPTION_KEY` in Cloudflare production.
3. Confirm `site_admins` and `pro_access_grants` rows in production contain only intended accounts.

---

## 7. Financial Calculation Accuracy

Beyond the **P0** findings (`hasPositionBefore` multi-split bug, EUR TTWROR vs. USD IRR mismatch, EUR `assetContributions` FX translation, `riskMetrics` `sqrt(365)` & negative index) and **P1** findings (`txs[0]` unsorted, `irr` `hi = 10` cap, live FX gaps):

- **CSV Import (`P2`):**
  - `generic()` in `src/lib/csv-import.ts:250-251` clamps dividend `quantity` via `Math.max(num(value(row, "quantity")), 1)`, inflating fractional-share dividends.
  - `generic()` and `trading212()` (`csv-import.ts:233-240,290-293,306-309`) sum multiple fee columns into one `fee` with a single `feeCurrency`.
  - `revolut()` (`csv-import.ts:322,327`) regex `/[A-Z]{3}/` misses `"GBp"` (lowercase `p`) and `€`/`£` symbols, silently defaulting to `"USD"`.
  - `rejectedCsvRows` (`csv-import.ts:425-502`) re-runs `parseBrokerCsv` per rejected row ($O(N^2)$).
- **Division-by-Zero & `NaN` Hazards (`P2`):**
  - `periodReturns` (`src/lib/portfolio.ts:157-165`): no guard for `buckets <= 0` or `series[i - step]!.v === 0`.
  - `ttwror` (`src/lib/portfolio.ts:462-466`): no guard for `series[i - 1]!.v <= 0`.
  - `computeHoldings` (`src/lib/portfolio.ts:204,207`): `change24h === -100` yields `-Infinity`; `.sort((a, b) => b.value - a.value)` is non-transitive when `value` is `NaN`.
  - `brokerHoldings` (`portfolio.ts:325`) & `fifoTaxReport` (`tools.ts:306`): `fee / quantity` divides by zero if `quantity === 0`.
  - `totalDividends` (`portfolio.ts:394-398`): single `NaN` dividend turns portfolio total into `NaN`.
- **AI Portfolio Valuation Asymmetry (`P2`):** `loadValuedPortfolio` (`src/lib/ai-portfolio.server.ts:189-190`) sums `0` for unquoted holdings' `totalValue` while including their full `costBasis` in `totalCost`.
- **Interpolation & ETF Overlap (`P2`):** `valueAt`/`rangeReturn` (`src/lib/return-periods.ts:28-63`) divides by `0` on duplicate timestamps and misattributes cash flows when `range.start` is interpolated; `calculateEtfOverlap` (`src/lib/etf-overlap.ts:208`) compares `holding.asset.symbol.toUpperCase() === fund.symbol` without uppercasing `fund.symbol` and only reflects top-10 Yahoo holdings.
- **Data Quality & Benchmark (`P3`):** `src/lib/quality.ts:85` uses `> 0` instead of `> 1e-9`; `src/lib/benchmark.ts:64` uses 7-day `maxAgeDays`, which can fail on extended exchange holidays (e.g. `^N225`).

*(Verified clean: SEC EDGAR 10-K/10-K/A parsing, NVDA/AMZN/META FCF reconciliation, latest-only EPS withholding, DCF validation, GBX `1/100` & BGN `1.95583` peg, and `performance-attribution.ts` reconciliation.)*

---

## 8. Architecture and Maintainability

1. **Monolithic Files (`P3`):** 10 files exceed 900 lines, led by `ProCompanyResearch.tsx` (1,636), `brokers.tsx` (1,567), `index.tsx` (1,543), `holdings.tsx` (1,291), `analytics.tsx` (1,289), `AppShell.tsx` (1,111), `ProFinancials.tsx` (1,086), `PortfolioProvider.tsx` (1,052), `market.functions.ts` (989), and `tools.tsx` (935). Inline `COPY` objects (300–565 lines each) inflate component/route files.
2. **Inconsistent Validation & Error Handling (`P3`):** Symbol Zod schemas vary across `market.functions.ts:107`, `dividends.functions.ts:25,71`, and `quotes.functions.ts:21`; `marketExtended` caches provider `null` failures for 60s (`market.functions.ts:129-132`); `advisor.ts` returns JSON errors while `thesis.ts` returns plain text.
3. **TypeScript Escape Hatches (`P3`):** `as unknown as` casts in `WallTeaser.tsx:30`, `wall.tsx:48`, `portfolio-snapshot.ts:38`, `edge-cache.server.ts:31`, `admin-insights.ts:57,74`; `as never` in `SnapshotCard.tsx:71,109` and `advisor.ts:56,113`; 40+ `!.` non-null assertions (e.g., `community.tsx:58`, `profile.tsx:68,72,140`).
4. **Fragmented Server Caches (`P2`):** `market.functions.ts`, `history.server.ts`, `prices.server.ts`, and `sec-financials.server.ts` each maintain unbounded module-level `Map` caches alongside `edge-cache.server.ts`.

---

## 9. SEO, Internationalization, and Accessibility

- **SEO (`P1`):** Fix `public/robots.txt` bot-specific `Allow: /` blocks, convert `/api/og` from SVG to raster PNG/WebP, align trailing-slash canonical on `/`, deduplicate canonical links and localize `head()` metadata on `etf-overlap.tsx` and `asset.$symbol.tsx`, add `validateSearch` for `lang` on `__root.tsx`, and remove `?lang=` alternates on static `/policies/ai-acceptable-use.html` in `sitemap.xml`.
- **i18n (`P2`):** Replace `lang === "bg" ? ... : ...` binary fallbacks in `AppShell.tsx`, `GuidePage.tsx`, `AddTransactionDialog.tsx`, `KeyboardShortcuts.tsx`, `AuthForm.tsx`, `LegalPage.tsx`, `RecurringReminders.tsx`, and `community.ts` with 5-language dictionaries (`en`, `bg`, `de`, `es`, `it`). Replace raw `p.lang` and `undefined` in `Intl.*Format` / `.toLocaleString()` calls (`DcfCalculator.tsx`, `AdminInsights.tsx`, `brokers.tsx`, `holdings.tsx`, etc.) with `languageLocale(p.lang)`.
- **Mobile & Accessibility (`P2`–`P3`):**
  - Render or remove dead `mobileMoreGroups` in `AppShell.tsx:386-425` so signed-in mobile users can reach `/watchlist`, `/alerts`, `/earnings`, `/compare`, `/timeline`, `/dividends`, `/tools`, `/community`, `/wall`, `/demo`.
  - Add `inert` / `visibility: hidden` / `pointer-events: none` to `.glass-bar[data-hidden="true"]` (`src/styles.css:459-462`) so hidden bottom nav links are not keyboard-focusable.
  - Eliminate SSR dark-mode flash (`__root.tsx:319`), add a skip-to-content link (`AppShell.tsx:763`), add `type="button"` (`AppShell.tsx:511`), and add `<DialogDescription>` / `aria-describedby={undefined}` to auth `<DialogContent>` (`AppShell.tsx:1072-1074`).

---

## 10. Testing and CI/CD

### Validation Results (Executed on Clean `main` @ `41bf005`)

| Check | Command | Result | Notes / Warnings |
| :--- | :--- | :--- | :--- |
| **TypeScript** | `npm run typecheck` (`tsc --noEmit`) | **Passed** (exit `0`) | 0 errors (`noUnusedLocals` / `noUnusedParameters` disabled in `tsconfig.json`) |
| **Test Suite** | `npm test` (`vitest run`) | **Passed** (exit `0`) | **101/101** test files, **640/640** tests passed in 46.35s (`jsdom`) |
| **ESLint** | `npm run lint` (`eslint .`) | **Passed** (exit `0`) | 0 errors, **3 warnings** (`react-refresh/only-export-components` in `ShareAllocationModal.tsx:33`, `asset.$symbol.tsx:35`, `etf-overlap.tsx:305`) |
| **Production Build** | `npm run build` | **Passed** (exit `0`) | Env check OK (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`), client + server built in 8.91s; 3 Vite `configLoader: 'native'` warnings on `vite.config.ts:6` |

### CI/CD & Coverage Gaps
- `.github/workflows/ci.yml:35-46` omits `npm run lint` and `prettier --check .`.
- `eslint.config.js:36` disables `@typescript-eslint/no-unused-vars` and `tsconfig.json:23-24` disables `noUnusedLocals`/`noUnusedParameters`, allowing dead code like `mobileMoreGroups` to go undetected.
- **3 untested API routes:** `src/routes/api/account/portal.ts`, `src/routes/api/admin-insights.ts`, `src/routes/api/moderation.ts`.
- **16 untested `src/lib/` modules:** `benchmark.functions.ts`, `brokers.functions.ts`, `company-suggestions.functions.ts`, `corporate-actions.functions.ts`, `feedback.functions.ts`, `sparklines.functions.ts`, `live-fx-persistence.server.ts`, `import-undo.ts`, `crypto-assets.ts`, `market-ticker.ts`, `portfolio-snapshot.ts`, `sec-fcf-labels.ts`, `legal.ts`, `own-avatar.ts`, `utils.ts`, and `og-svg.ts` (indirectly tested).
- **Audit limitation:** Live Supabase `pg_proc` ACLs, Storage bucket settings, and Cloudflare production bindings/secrets cannot be inspected from the local repository alone.

---

## 11. Prioritized Optimization Roadmap

### Phase 1 — Security & Financial Correctness (Quick Wins + P0s)
1. **Batch 1A (Financial P0s — independent):** Fix `hasPositionBefore` split replay (`history.functions.ts`), sort `txs` before `txs[0]` (`history.functions.ts`), fix `assetContributions` EUR prior-day FX (`history.ts`), fix `riskMetrics` `252` trading-day scaling & negative-return guard (`tools.ts`), and expand `irr` upper bracket (`portfolio.ts`).
2. **Batch 1B (Currency Consistency — separate):** Align `portfolioIrr` with selected display currency (`EUR`/`USD`) and fix `currentUsdPrice` `NaN` fallback + multi-currency live FX (`quotes.functions.ts`, `live-fx.ts`).
3. **Batch 1C (Security P0/P1):** Revoke `PUBLIC`/`anon` `EXECUTE` on `is_pro(uuid)`, tighten `profiles`/`avatars`/`wall_comments`/`wall_reactions` RLS policies (after live DB check), and add Cloudflare rate limiting to `/api/public/analytics` + outbound market `serverFn`s (`src/server.ts`).

### Phase 2 — High-Impact Performance & SEO Fixes
4. **Batch 2A (Server CPU & Waterfalls):** Replace `closeAt` linear scan with $O(1)$ forward cursor in `buildPortfolioHistory`, batch `MarketTicker` (6→1), cap `getSparklines` concurrency, and parallelize `getBenchmarkHistory` with `getPortfolioHistory`.
5. **Batch 2B (Client Re-renders):** Stop idle 1s `usePositionDeletion` timer on `/holdings`, gate `DataStatus` 60s timer to open `<details>`, stabilize `portfolio-history` query key, and split `PortfolioProvider` context.
6. **Batch 2C (SEO):** Fix `robots.txt` bot blocks, convert `/api/og` to PNG/WebP, and unify canonical/hreflang/localized `head()` on `/`, `/asset/$symbol`, and `/etf-overlap`.

### Phase 3 — Safe Deduplication, Bundle Size & Mobile/i18n
7. **Batch 3A (Code Splitting):** Lazy-load `recharts` on `/` & `SamplePortfolioPreview`, lazy-load `CommandMenu` & monitors in `AppShell`, and add `manualChunks` in `vite.config.ts`.
8. **Batch 3B (DRY & Cleanup):** Consolidate `ShareAllocationButton`/`Modal`, `CompanyLogo`/`CompanySuggestionLogo`, `formatNumber`/`toIsoDate`/`downloadBlob`/`requireApiAuth`; remove 38 dead `ui/*` files and 26 unused `package.json` deps.
9. **Batch 3C (Mobile & i18n):** Wire `mobileMoreGroups` + `inert` on hidden bottom nav, replace `bg`/`en` binary fallbacks with 5-language copy, and standardize `languageLocale(p.lang)`.

### Phase 4 — CI/CD & Test Hardening
10. Add `npm run lint` to `.github/workflows/ci.yml`, add tests for the 3 untested API routes and `hasPositionBefore` multi-split / EUR-IRR / `riskMetrics` regressions, and fix `advisor.ts` JSON error handling.

---

## 12. Top 10 Recommended Improvements

1. **Fix `hasPositionBefore` multi-split replay** (`src/lib/history.functions.ts:123-163`) — prevents silent history corruption after partial sells between splits.
2. **Revoke `PUBLIC`/`anon` `EXECUTE` on `is_pro(uuid)` & rate-limit `/api/public/analytics`** (`drizzle/migrations/0013_owner_admin_access.sql`, `src/server.ts:84-100`) — closes Pro-status enumeration and global analytics DoS.
3. **Align `portfolioIrr` currency with `TTWROR` & fix `assetContributions` EUR FX** (`src/lib/portfolio.ts:438`, `src/lib/history.ts:159`, `src/routes/index.tsx:617`) — ensures accurate EUR returns and attribution reconciliation.
4. **Fix `riskMetrics` `sqrt(365)` dilution & `< -100%` drawdown bug** (`src/lib/tools.ts:378-407`) — restores accurate volatility and Sharpe ratios.
5. **Optimize `buildPortfolioHistory` `closeAt` from $O(P)$ to $O(1)$ cursor** (`src/lib/history.ts:60-68,92-179`) — prevents Cloudflare Worker CPU spikes on multi-year portfolios.
6. **Split `PortfolioProvider` context, stabilize `portfolio-history` queryKey & stop idle 1s `Holdings` timer** (`src/lib/PortfolioProvider.tsx`, `src/hooks/use-position-deletion.ts:98-109`) — eliminates 60s full-app and 1s `/holdings` re-render storms.
7. **Eliminate 3-step Dashboard/Analytics waterfall & batch `MarketTicker` (6→1)** (`src/routes/index.tsx`, `src/components/MarketTicker.tsx:82-89`) — measurably faster chart load times.
8. **Fix `public/robots.txt` crawler blocks & convert `/api/og` from SVG to PNG/WebP** (`public/robots.txt:1-21`, `src/routes/api/og.ts:16-23`) — protects private routes from Googlebot/Bingbot and enables social unfurls.
9. **Lazy-load `recharts` & `CommandMenu` on `/` + remove 38 dead `ui/*` files & 26 unused deps** (`src/routes/index.tsx`, `src/components/AppShell.tsx`, `package.json`) — shrinks initial JS bundle and maintenance surface.
10. **Restore `mobileMoreGroups` menu & replace `bg`/`en` binary i18n fallbacks** (`src/components/AppShell.tsx:386-425`, `GuidePage.tsx`, `AddTransactionDialog.tsx`) — unlocks full mobile navigation and true 5-language UX.
