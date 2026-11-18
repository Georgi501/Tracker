# CapiSpot — UI/UX, CSS & Responsive Design Overhaul Checkpoint (Phases 1, 2 & 3)

## 1. Complete Route-by-Route Coverage Matrix

All 38 UI route modules in `src/routes/` and their shared components were audited across Phases 1, 2, and 3. The matrix below strictly separates:
- **Visually Verified (Live Browser + Playwright Screenshots & DOM Metrics)** across desktop (`1440px`, `1280px`, `1024px`) and mobile (`360px`, `390px`, `430px`, `768px`), dark/light themes, and 5 languages (`en`, `bg`, `de`, `es`, `it`).
- **Code-Reviewed Only** (static routes sharing verified templates or parameterized wrappers around verified core views).
- **Not Tested in Browser** (parameterized child thread route `/advisor/$threadId`, covered by Vitest unit/integration tests and sharing `AdvisorLayout.tsx` with visually verified `/advisor`).
- **Confirmed & Fixed Issues** (with exact file references and before/after verification).

| Route Path | File | Verification Level | Viewports / Langs Tested | Confirmed & Fixed Issues |
| :--- | :--- | :--- | :--- | :--- |
| `/` (Visitor Homepage) | `src/routes/index.tsx` | **Visually Verified** | `1440px`, `360px` (`en`, `bg`, `de`, dark/light) | Global Header search unclipped (`Phase 1`). Documented duplicate header inside embedded `VideoPresentation` iframe for Next Phase (Video Modernization). |
| `/` (Authenticated Dashboard) | `src/routes/index.tsx` | **Visually Verified** | `1920px`, `1440px`, `1280px`, `1024px`, `768px`, `430px`, `390px`, `360px` (`en`, `bg`, `de`, `es`, `it`, dark/light) | **Fixed (Phase 2):** `Recent activity` occupied only 1 of 3 columns (`405px` of `1248px`), leaving an `843px` (`66.7%`) blank void on the right. Expanded to `lg:col-span-3` with a 2-column desktop activity grid (`lg:grid-cols-2`). Localized `"Realized P&L"` and `"of portfolio"` across all 5 languages. |
| `/holdings` | `src/routes/holdings.tsx` | **Visually Verified** | `1920px`–`360px` (`en`, `bg`, `de`, `es`, `it`, dark/light) | **Fixed (Phase 1):** Expanded Holdings search input (`384px` -> `512px`), paired `Holdings Summary` + `AllocationCard` side-by-side at `250px` height (`-44%` vertical footprint), lowered `.holdings-table` container threshold from `60rem` to `56rem` so `1024px` renders the desktop table (`538px` vs `952px`). |
| `/pricing` | `src/routes/pricing.tsx` | **Visually Verified** | `1440px`, `360px` (`en`, `de`, dark) | **Fixed (Phase 2):** 1) `#plan-comparison` 3-column table clipped right-column text at `x=360px` on mobile (`"CSV-Import (IBKR, T212, Revolut)"` cut off); converted to stacked mobile rows (`grid-cols-1 sm:grid-cols-[1fr_1fr_1.3fr]`) with `FREE:` / `PRO:` mobile badges. 2) Bottom 2-card showcase used `md:grid-cols-3`, leaving column 3 empty (`405px` gap); changed to `md:grid-cols-2`. |
| `/demo` | `src/routes/demo.tsx` | **Visually Verified** | `1440px`, `360px` (`en`, dark) | Clean responsive layout (`pageOverflow: false`); uses shared `AllocationBreakdown` improvements from Phase 1. |
| `/import-demo` | `src/routes/import-demo.tsx` | **Visually Verified** | `1440px`, `360px` (`en`, dark) | Clean 3-column desktop / 1-column mobile onboarding workflow (`pageOverflow: false`). |
| `/brokers` | `src/routes/brokers.tsx` | **Visually Verified** | `1440px`, `360px` (`en`, `de`, dark) | **Fixed (Phase 3):** Localized `IMPORT_GUIDE` header/cards into `de`, `es`, and `it` (previously fell back to English). |
| `/trading212-import` | `src/routes/trading212-import.tsx` | **Visually Verified** | `1440px`, `360px` (`en`, `de`, dark) | **Fixed (Phase 3):** Added complete `de`, `es`, and `it` translations to `/trading212-import` and `src/components/RelatedGuides.tsx` (previously English-only when browsing in German/Spanish/Italian). |
| `/ibkr-import` | `src/routes/ibkr-import.tsx` | **Visually Verified** | `1440px` (`en`, dark) | Clean layout (`pageOverflow: false`); benefits from localized `RelatedGuides.tsx`. |
| `/revolut-import` | `src/routes/revolut-import.tsx` | **Code-Reviewed Only** | Shares identical guide layout & `RelatedGuides` with `/trading212-import` & `/ibkr-import` | Benefits from `RelatedGuides.tsx` 5-language localization. |
| `/analytics` | `src/routes/analytics.tsx` | **Visually Verified** | `1440px`, `360px` (`en`, `de`, dark) | **Fixed (Phase 2/3):** Localized `ETF overlap` `ProGate` title/description and `AllocationBreakdown` `totalLabel` across `en`, `bg`, `de`, `es`, `it`; benefits from `ProGate` CSS Grid single-cell overlay fix. |
| `/tools` | `src/routes/tools.tsx` | **Visually Verified** | `1440px`, `360px` (`en`, `de`, dark) | **Fixed (Phase 2):** Eliminated **3 separate 50%-width (`614px`) empty desktop grid gaps** in `Free` (`Watchlist` -> `lg:col-span-2`), `For my portfolio` (paired `DataQuality` + `RecurringReminders`, `Risk` + `ConcentrationCard`, `GoalsCard` `lg:col-span-2`), and `Pro` (`Tax` -> `lg:col-span-2`). Localized `toolGroups` and `Shareable portfolio snapshot` across all 5 languages. |
| `/dividends` | `src/routes/dividends.tsx` | **Visually Verified** | `1440px`, `360px` (`en`, dark) | Clean responsive KPI grid, calendar, and event table (`pageOverflow: false`). |
| `/watchlist` | `src/routes/watchlist.tsx` | **Visually Verified** | `1440px`, `360px` (`en`, dark) | **Fixed (Phase 2):** 1) `ProGate` (`DCF estimates`) clipped its lock header and `"Upgrade to Pro"` CTA vertically on `360px` mobile because the blurred 3-row preview (`165px`) was shorter than the absolute overlay text; fixed in `src/components/ProFeatures.tsx` via CSS Grid single-cell overlay (`col-start-1 row-start-1`). 2) Fixed mobile star remove button alignment (`col-span-2 justify-self-end md:col-span-1`). |
| `/alerts` | `src/routes/alerts.tsx` | **Visually Verified** | `1440px`, `360px` (`en`, dark) | Clean form and alert list layout (`pageOverflow: false`). |
| `/markets` | `src/routes/markets.tsx` | **Visually Verified** | `1440px`, `360px` (`en`, dark) | **Fixed (Phase 2):** On `360px` mobile, the search form kept input + submit button on a single row (`flex gap-2`), crushing the search input to `159px` (`"Tesla, BMW, ME"` clipped). Changed to `flex-col sm:flex-row` with `w-full sm:w-auto` submit button, expanding mobile input width from **`159px` to `318px` (`+100%`)**. |
| `/compare` | `src/routes/compare.tsx` | **Visually Verified** | `1440px`, `360px` (`en`, dark) | Clean ticker selector chips and comparison cards (`pageOverflow: false`). |
| `/etf-overlap` | `src/routes/etf-overlap.tsx` | **Visually Verified** | `1440px`, `360px` (`en`, dark) | Clean 2-picker overlap analyzer and intersection table (`pageOverflow: false`). |
| `/community` | `src/routes/community.tsx` | **Visually Verified** | `1440px`, `360px` (`en`, dark) | Verified both `CommunityUpsell` and Pro member directory grid (`pageOverflow: false`). |
| `/community/$userId` | `src/routes/community.$userId.tsx` | **Code-Reviewed Only** | Parameterized profile detail route sharing `CommunityUpsell` and standard `bg-card` layout | Uses responsive `sm:flex-row` header and percentage-only public allocation list. |
| `/wall` | `src/routes/wall.tsx` | **Visually Verified** | `1440px`, `360px` (`en`, dark) | Clean composer, feed filters, and post cards (`pageOverflow: false`). |
| `/messages` | `src/routes/messages.tsx` | **Visually Verified** | `1440px`, `360px` (`en`, dark) | Clean split inbox / conversation thread layout (`pageOverflow: false`). |
| `/profile` | `src/routes/profile.tsx` | **Visually Verified** | `1440px`, `360px` (`en`, dark) | Clean profile editor and public portfolio opt-in toggle (`pageOverflow: false`). |
| `/admin` (Owner Console) | `src/routes/admin.tsx` | **Visually Verified** | `1440px`, `360px` (`en`, dark, live production + staging + local mock) | **Fixed (Phase 3):** Added 5-language localization (`en`, `bg`, `de`, `es`, `it`) and graceful inline error state (`loadFailed`) to `src/components/ModerationPanel.tsx` so failed moderation fetches never hang on `…`. |
| `/account` | `src/routes/account.tsx` | **Visually Verified** | `1440px`, `360px` (`en`, `de`, dark) | **Fixed (Phase 3):** Localized `SecurityCard` (`Sign-in & security`, `Add photo`, `Change email`, `Change password`, etc.) across all 5 languages (`en`, `bg`, `de`, `es`, `it`). |
| `/timeline` | `src/routes/timeline.tsx` | **Visually Verified** | `1440px`, `360px` (`en`, dark) | **Fixed (Phase 2):** On `360px` mobile, transaction rows kept symbol+title, date+broker, and amount in a single horizontal flex row, crushing `"2026-04-10 · Buy · Interactive Brokers"` into a `38px`-wide 8-line vertical column (`height: 156px`). Changed `<li>` to `flex-col gap-2 py-1 sm:flex-row sm:items-center sm:justify-between`, reducing mobile row height to `98px` (`-37%`) with full horizontal readability. |
| `/earnings` | `src/routes/earnings.tsx` | **Visually Verified** | `1440px`, `360px` (`en`, dark) | Clean upcoming earnings calendar and filter chips (`pageOverflow: false`). |
| `/asset/$symbol` (`/asset/AAPL`) | `src/routes/asset.$symbol.tsx` | **Visually Verified** | `1440px`, `360px` (`en`, dark) | Clean interactive chart, key metrics grid, SEC EDGAR annual financials table, and position thesis journal (`pageOverflow: false`). |
| `/market/$slug` | `src/routes/market.$slug.tsx` | **Code-Reviewed Only** | Public SEO instrument overview wrapper around shared quote/chart primitives | Uses responsive `sm:grid-cols-2 lg:grid-cols-4` cards and `overflow-x-auto` tables. |
| `/advisor` | `src/routes/advisor.tsx`, `src/components/AdvisorLayout.tsx` | **Visually Verified** | `1440px`, `360px` (`en`, dark) | Clean sidebar drawer + prompt composer layout (`pageOverflow: false`). |
| `/advisor/$threadId` | `src/routes/advisor.$threadId.tsx` | **Not Tested in Browser (Covered by Vitest)** | Shares `AdvisorLayout.tsx` with `/advisor`; covered by `src/test/` advisor route tests | Uses identical `AdvisorLayout` shell verified on `/advisor`. |
| `/auth` | `src/routes/auth.tsx` | **Visually Verified** | `1440px`, `360px` (`en`, dark) | Clean centered auth card, social/email tabs, and validation states (`pageOverflow: false`). |
| `/reset-password` | `src/routes/reset-password.tsx` | **Code-Reviewed Only** | Shares centered auth card structure with `/auth` | Clean `max-w-md` single-column form. |
| `/features` | `src/routes/features.tsx` | **Visually Verified** | `1440px` (`en`, dark) | Clean feature matrix and CTA layout (`pageOverflow: false`). |
| `/terms`, `/privacy`, `/disclaimer`, `/cookies` | `src/routes/terms.tsx`, `privacy.tsx`, `disclaimer.tsx`, `cookies.tsx` (`src/components/LegalPage.tsx`) | **Code-Reviewed Only** | Shared `LegalPage.tsx` prose container (`max-w-3xl`) | Clean typography and responsive padding. |

---

## 2. Summary of Phase 1, Phase 2 & Phase 3 Fixes

### Phase 1 (Committed in `81b2c9e`)
1. **Global Header Search & Navigation Unclipping (`src/components/HeaderSearch.tsx`, `src/components/AppShell.tsx`, `src/components/CommandMenu.tsx`, `src/styles.css`):**
   - Conditional clear-button padding (`${value ? "pr-9" : "pr-3.5"}`), concise top-nav `/markets` labels (`Asset search`, `Пазари`, `Marktsuche`, `Mercados`, `Mercati`), `hidden 2xl:inline-flex` on inline `/watchlist` & `/alerts` pills (accessible via `More v` on `<1536px`), and single-row `.header-layout` breakpoint at `1280px` (giving `1024px` laptops a full-width `980px` Row 2 search input).
2. **Holdings Search & Side-by-Side Summary + Allocation (`src/routes/holdings.tsx`, `src/components/AllocationCard.tsx`, `src/components/AllocationBreakdown.tsx`, `src/styles.css`):**
   - Expanded Holdings search input from `384px` (`sm:w-96`) to `512px` (`sm:min-w-[26rem] sm:flex-1 lg:max-w-lg`).
   - Paired `Holdings Summary` and `AllocationCard` side-by-side on desktop at an aligned `250px` height (`-44%` vertical footprint), moved `<ShareAllocationButton>` into the `AllocationCard` header, and lowered `.holdings-table` container threshold from `60rem` (`960px`) to `56rem` (`896px`).

### Phase 2 & Phase 3 (Completed in Current Commit)
1. **`ProGate` Mobile Vertical Clipping (`src/components/ProFeatures.tsx`):**
   - **Root Cause:** `ProGate` used `relative overflow-hidden` on the container and `absolute inset-0` on the lock overlay (`z-10`). When a caller passed a compact `preview` (such as the 3-row `DCF estimates` preview on `/watchlist`, `height: 165px`) and the overlay description wrapped to 4 lines on `360px` mobile, the overlay content overflowed the `165px` container and clipped the lock icon and `"Upgrade to Pro"` CTA button top/bottom.
   - **Fix:** Converted `ProGate` to a single-cell CSS Grid overlay (`grid overflow-hidden rounded-xl` on the container, `col-start-1 row-start-1` on both the blurred preview and the `z-10` lock overlay). The container now automatically expands to the taller of the preview or the lock message across all viewports and languages.
2. **Pricing Comparison Mobile Clipping & Desktop 2-Card Grid Gap (`src/routes/pricing.tsx`):**
   - **Root Cause:** `#plan-comparison` forced `grid-cols-[1.2fr_1fr_1.2fr]` even on `360px` screens, cutting off `"CSV-Import (IBKR, T212, Revolut)"` and `"Verifizierte Dividenden-Historie + Kalender"` at the right viewport boundary. Below it, a 2-card showcase used `md:grid-cols-3`, leaving column 3 empty (`405px` blank space).
   - **Fix:** Made `#plan-comparison` rows stack cleanly on `<640px` (`grid-cols-1 gap-1.5 sm:grid-cols-[1fr_1fr_1.3fr]`) with inline `FREE:` and `PRO:` mobile badges (`sm:hidden`), and changed the 2-card showcase grid to `md:grid-cols-2`.
3. **Authenticated Dashboard `Recent activity` 66.7% Empty Row Gap & i18n (`src/routes/index.tsx`):**
   - **Root Cause:** Inside the 3-column bottom grid (`lg:grid-cols-3`), `Top holdings` (`lg:col-span-2`) and `Winners & Losers` (`1 col`) filled Row 1, leaving `Recent activity` alone in Row 2 spanning only 1 column (`405px` wide) with `843px` (`66.7%`) of empty space to its right. Additionally, `"Realized P&L"` and `"of portfolio"` were hardcoded in English.
   - **Fix:** Added `lg:col-span-3` to `Recent activity` with a 2-column desktop transaction grid (`grid divide-y divide-border lg:grid-cols-2 lg:gap-x-6`), and localized `"Realized P&L"` and `"of portfolio"` across `en`, `bg`, `de`, `es`, and `it`.
4. **Tools Route (`/tools`) Three 50%-Width Desktop Grid Gaps & i18n (`src/routes/tools.tsx`):**
   - **Root Cause:** Each of the three `lg:grid-cols-2` sections (`Free`, `For my portfolio`, `Pro`) had an odd number of 1-column cards or an unpaired `lg:col-span-2` card (`ConcentrationCard` at index 1), leaving three separate `614px`-wide (`50%`) empty holes on desktop. Section titles (`Free`, `For my portfolio`, `Pro`) and `Shareable portfolio snapshot` were also hardcoded in English.
   - **Fix:** Added `lg:col-span-2` to `Watchlist` (in `Free`) and `Tax` (in `Pro`), reordered `For my portfolio` so `DataQuality` + `RecurringReminders` pair on Row 1, `Risk` + `ConcentrationCard` pair on Row 2, and `GoalsCard` (`lg:col-span-2`) spans Row 3, and localized all group headers and `Shareable portfolio snapshot` across `en`, `bg`, `de`, `es`, `it`.
5. **Markets Route (`/markets`) Mobile Search Input Crushing (`src/routes/markets.tsx`):**
   - **Root Cause:** The search `<form>` used `flex max-w-2xl gap-2` at all screen sizes, leaving the text input only `159px` wide on `360px` mobile (`"Tesla, BMW, META, Bitcoin…"` clipped to `"Tesla, BMW, ME"`).
   - **Fix:** Changed the form to `flex max-w-2xl flex-col gap-2 sm:flex-row` with `w-full sm:w-auto` on the submit button, doubling mobile search input width from `159px` to `318px` (`100%` placeholder visibility).
6. **Watchlist Route (`/watchlist`) Mobile Remove Button Alignment (`src/routes/watchlist.tsx`):**
   - **Root Cause:** On `<768px`, each watchlist card uses `grid-cols-2`, placing the remove star `<button>` as the 5th grid item floating in column 1 of row 3.
   - **Fix:** Added `col-span-2 justify-self-end md:col-span-1` so the star button aligns cleanly to the bottom-right corner on mobile and stays in column 5 on desktop.
7. **Timeline Route (`/timeline`) Mobile Transaction Row Crushing (`src/routes/timeline.tsx`):**
   - **Root Cause:** Each transaction `<li>` used `flex items-center justify-between gap-3`, squeezing the middle date/kind/broker span (`"2026-04-10 · Buy · Interactive Brokers"`) into a `38px`-wide 8-line vertical column (`height: 156px`) on `360px` mobile.
   - **Fix:** Changed `<li>` to `flex flex-col gap-2 py-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3`, giving mobile a clean 2-row card layout (`height: 98px`, `-37%` vertical space) with full horizontal text readability.
8. **Multi-Language (`de`/`es`/`it`) Completeness Across `/analytics`, `/account`, `/trading212-import`, `/brokers`, `RelatedGuides`, and `/admin` (`ModerationPanel`):**
   - Added complete `en`, `bg`, `de`, `es`, `it` translations to `src/routes/analytics.tsx` (`ETF overlap` `ProGate` & `AllocationBreakdown` `totalLabel`), `src/routes/account.tsx` (`SecurityCard`), `src/routes/trading212-import.tsx`, `src/components/RelatedGuides.tsx`, `src/routes/brokers.tsx` (`IMPORT_GUIDE`), and `src/components/ModerationPanel.tsx` (including graceful inline `loadFailed` error state).

---

## 3. Phase 2 & Phase 3 Quantitative Before vs. After Measurements

| Route / Viewport / Lang | Metric | BEFORE (`phase2-before`) | AFTER (`phase2-after`) | Improvement |
| :--- | :--- | :--- | :--- | :--- |
| **`/` Dashboard (`1440px`, `en`)** | `Recent activity` Card Width / Row Coverage | `405px` (`33.3%`, `843px` empty void) | `1248px` (`100%` width, 2-col activity grid) | **+843px (+208% width, 0 empty void)** |
| **`/pricing` (`1440px`, `en`)** | Bottom 2-Card Showcase Row Coverage | `2 × 405px` (`md:grid-cols-3`, `405px` gap) | `2 × 616px` (`md:grid-cols-2`, 100% row) | **Eliminated 405px blank column** |
| **`/pricing` (`360px`, `de`)** | `#plan-comparison` Mobile Text Clipping | 3 columns (`~100px` each, right col cut off) | Stacked mobile rows with `FREE:` / `PRO:` badges | **100% text visibility, 0 clipping** |
| **`/tools` (`1440px`, `de`)** | Empty 50%-Width Desktop Grid Holes | `3` holes (`3 × 614px` blank spaces) | `0` holes (all 3 tool groups balanced) | **Eliminated 3 desktop grid gaps** |
| **`/markets` (`360px`, `en`)** | Mobile Asset Search Input Width | `159px` (`"Tesla, BMW, ME"` clipped) | `318px` (`"Tesla, BMW, META, Bitcoin…"` 100% visible) | **+159px (+100% input width)** |
| **`/watchlist` (`360px`, `en`)** | `DCF estimates` `ProGate` Card Height | `165px` (lock icon & CTA button clipped) | `222px` (CSS Grid single-cell overlay, 0 clipping) | **Full lock card & CTA visibility** |
| **`/timeline` (`360px`, `en`)** | Mobile Transaction Row Width / Height | Date crushed into `38px` col (`156px` tall) | Full-width stacked mobile row (`98px` tall) | **-37% row height, full readability** |
| **All 44 Audited Captures** | Horizontal Page Overflow (`scrollWidth > innerWidth`) | `0` routes overflowing | `0` routes overflowing (`pageOverflow: false`) | **Zero horizontal scroll across all routes** |

---

## 4. Separate Financial Correctness Report: Region Classification (`SXR8.DE` Showing ~98% Europe)

> [!IMPORTANT]
> Per strict financial guardrails, **no financial calculation or region assignment logic was modified during the UI/UX overhaul**. This section documents the exact root cause and provides a self-contained implementation and unit test specification for a dedicated financial logic task.

### Root Cause
1. In `src/components/AddTransactionDialog.tsx` (line 238), newly added assets assign `region` using only the trading currency:
   ```ts
   region: cur === "EUR" ? "Europe" : "Global",
   ```
2. In `src/lib/PortfolioProvider.tsx` (line 906), CSV-imported assets assign `region` using:
   ```ts
   region: r.assetType === "crypto" ? "Global" : "North America",
   ```
3. Meanwhile, `src/lib/market-search.ts` (lines 106–121) already contains the authoritative `UCITS` metadata catalog with `index` (`"S&P 500"`, `"NASDAQ-100"`, `"FTSE All-World"`, `"MSCI World"`, `"MSCI ACWI"`, `"MSCI EM"`, `"STOXX Europe 600"`, `"DAX"`), `domicile`, and `currency`.
4. Because `SXR8.DE` (iShares Core S&P 500 UCITS ETF) trades on Xetra in `EUR`, `AddTransactionDialog.tsx` stores `region: "Europe"` (reflecting trading currency) instead of `"North America"` (its underlying `S&P 500` exposure), causing `Allocation -> Region` on `/holdings` (`src/routes/holdings.tsx` line 156) to report ~98% Europe for an S&P 500 portfolio.

### Proposed Fix for Dedicated Follow-Up Task
1. Add a pure helper `inferAssetRegion({ symbol, type, currency }: { symbol: string; type?: string; currency?: string }): string` in `src/lib/market-search.ts`:
   - If `type === "crypto"`, return `"Global"`.
   - Look up `symbol.toUpperCase()` in `UCITS`:
     - `index` in `["S&P 500", "NASDAQ-100"]` -> `"North America"`
     - `index` in `["STOXX Europe 600", "DAX"]` -> `"Europe"`
     - `index` in `["FTSE All-World", "MSCI World", "MSCI ACWI"]` -> `"Global"`
     - `index` in `["MSCI EM"]` -> `"Emerging Markets"`
   - Fall back to exchange suffix / currency (`symbol.endsWith(".DE") || symbol.endsWith(".L") || symbol.endsWith(".PA") || symbol.endsWith(".AS") || currency === "EUR" || currency === "GBP"` -> `"Europe"`, `currency === "USD"` -> `"North America"`, otherwise `"Global"`).
2. Call `inferAssetRegion` consistently in both `src/components/AddTransactionDialog.tsx` and `src/lib/PortfolioProvider.tsx`, and normalize known `UCITS` symbols at selector time in `AllocationCard` / `holdings.tsx` so existing saved rows immediately display accurate underlying region exposure without requiring a destructive database migration.
3. **Unit Tests to Add (`src/test/ucits.test.ts`):**
   - `inferAssetRegion({ symbol: "SXR8.DE", type: "etf", currency: "EUR" }) === "North America"`
   - `inferAssetRegion({ symbol: "VUAA.DE", type: "etf", currency: "EUR" }) === "North America"`
   - `inferAssetRegion({ symbol: "VWCE.DE", type: "etf", currency: "EUR" }) === "Global"`
   - `inferAssetRegion({ symbol: "EXSA.DE", type: "etf", currency: "EUR" }) === "Europe"`
   - `inferAssetRegion({ symbol: "IS3N.DE", type: "etf", currency: "EUR" }) === "Emerging Markets"`
   - `inferAssetRegion({ symbol: "AAPL", type: "stock", currency: "USD" }) === "North America"`
   - `inferAssetRegion({ symbol: "SAP.DE", type: "stock", currency: "EUR" }) === "Europe"`
   - `inferAssetRegion({ symbol: "BTC", type: "crypto", currency: "USD" }) === "Global"`

---

## 5. Product Presentation Modernization (Completed — Phase 4)

### Root Causes Identified in BEFORE Audit
1. **Duplicated Presentation Header (`body.embedded .section-heading`):** `src/components/VideoPresentation.tsx` rendered an outer card header (`See CapiSpot in action.` + `[Portfolio tour | Pro tools]`) while `public/video-preview/index.html` left `.section-heading` (`See the product. Understand the difference.` + a second `[Portfolio tour | Pro tools]` toggle) visible when `embed=1`.
2. **Restrictive Height Clamping (`Math.min(event.data.height, 420)`) & Vertical Content Clipping:** `VideoPresentation.tsx` clamped the iframe height to `420px` (defaulting to `300px`/`330px`), clipping `48px`–`138px` of content on desktop (`468px` tall) and cutting off **100% of `.scene-copy` (`379px`–`499px` clipped)** on mobile (`360px`/`390px`, where `.player-layout` stacks to `799px–825px`).
3. **Hidden Scene Navigation & Player Controls in Embedded Mode (`body.embedded .clip-controls { display: none; }`):** `public/video-preview/index.html` hid `#clip-controls` in embedded mode, depriving homepage visitors of chapter pills, Next/Previous buttons, and the seek bar.
4. **Narrow Portrait Mobile Screenshot Frame (`340px`, `916:984`) & Outdated/Clipped PNG Assets:** All 10 `public/video-preview/ui-*.png` files were pre-overhaul mobile portrait screenshots (`916×984`) showing the old clipped header search (`"Search for news, ti"`), floating mobile bottom nav bars covering the bottom 20% of content, cut-off table columns in `ui-holdings.png`, and outdated `"1 broker connection (CSV)"` text in `ui-pro-features.png`.
5. **Distracting Center Play Button & Ambient Synth Drone:** A `72px` central play button obscured the middle of every product screenshot, and an oscillator drone (`#sound-toggle`) synthesized background audio.

### Changes Applied
1. **`src/components/VideoPresentation.tsx`:**
   - Expanded dynamic iframe height range to `Math.max(440, Math.min(Math.ceil(event.data.height), 980))` with a two-way `capispot-video-preview:request-height` / `capispot-video-preview:resize` postMessage handshake (`onLoad` + mount timeouts) and theme-aware iframe key (`${activeMode}-${lang}-${theme}`).
2. **`public/video-preview/index.html`:**
   - Hid `.section-heading` in `body.embedded` while preserving it in standalone `/video-preview/`.
   - Un-hid `.clip-controls` (Next/Previous, Play/Pause, seek progress bar, time indicator, and clickable chapter pills) in embedded mode.
   - Updated `.screen-frame` from `340px` portrait (`916 / 984`) to `width: min(100%, 660px); aspect-ratio: 10 / 7` (`660×462` on desktop, full width `292×204` on `360px` mobile) and moved `.big-play` to a sleek `38×38px` bottom-left corner badge so screenshots are never obstructed.
   - Disabled the Web Audio oscillator synth (`soundEnabled = false`) and hid `#sound-toggle`.
3. **Refreshed All 11 Product Screenshots from the Live Overhauled Application (`2560×1792` @ 2x retina, sanitized sample data):**
   - `public/hero-portfolio.png` (`2560×1920`)
   - `public/video-preview/ui-overview.png`
   - `public/video-preview/ui-holdings.png`
   - `public/video-preview/ui-import.png`
   - `public/video-preview/ui-market-discovery.png`
   - `public/video-preview/ui-dividends.png`
   - `public/video-preview/ui-features.png`
   - `public/video-preview/ui-fifo.png`
   - `public/video-preview/ui-dcf.png`
   - `public/video-preview/ui-pro-features.png`
   - `public/video-preview/ui-pro-preview.png`

### Quantitative Before vs. After Presentation Metrics
| Viewport / Mode / Lang | Metric | BEFORE (`video-before`) | AFTER (`video-after`) |
| :--- | :--- | :--- | :--- |
| **All 14 Embedded Views (`1440px`–`360px`, 5 langs)** | Duplicate Internal Header (`innerHeadingVisible`) | `true` (14 / 14 duplicated) | **`false` (0 / 14 duplicated)** |
| **All 14 Embedded Views (`1440px`–`360px`, 5 langs)** | Vertical Content Clipping (`contentClippedVertically`) | `true` (14 / 14 clipped) | **`false` (0 / 14 clipped)** |
| **All 14 Embedded Views (`1440px`–`360px`, 5 langs)** | Interactive Controls & Chapters (`clipControlsVisible`) | `false` (hidden in embed) | **`true` (14 / 14 visible & clickable)** |
| **Desktop `1440px` (`en`/`bg`/`de`/`es`/`it`)** | Product Screenshot Frame Size | `340px × 365px` (portrait mobile crop) | **`660px × 462px` (`10:7` desktop view)** |
| **Mobile `360px` (`en`/`bg`/`de`, dark/light)** | Iframe Height vs Content Height | `300px–420px` vs `799px–825px` (cut off) | **`653px–679px` vs `653px–679px` (100% fit)** |

---

## 6. Preserved Post-Video Roadmap: Analytics, Conversion Funnel, Onboarding & User Acquisition

To be executed **after** the Product Video Modernization Phase:
1. **Privacy-Safe Conversion Funnel Telemetry:** Track anonymous step completion across `Landing Page -> Demo / CSV Import Preview -> Sign Up -> First Portfolio Import -> Pro Upgrade View` without third-party ad trackers.
2. **Guided First-Import Onboarding & Broker Auto-Detection:** Expand `FirstImportWizard` with instant broker detection badges (Trading 212, IBKR, Revolut) and automatic underlying-index region enrichment for UCITS ETFs.
3. **Pro Trial Lifecycle & Renewal Prompts:** Surface clear remaining-days badges for temporary Pro grants issued via the Owner Console (`/admin`) with seamless upgrade CTAs before expiration.
4. **Programmatic SEO & Broker Guide Acquisition Loop:** Expand interlinking between `/markets`, `/asset/$symbol`, `/etf-overlap`, and the 5-language broker import guides (`/trading212-import`, `/ibkr-import`, `/revolut-import`).
