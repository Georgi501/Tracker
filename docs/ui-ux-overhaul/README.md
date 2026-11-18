# CapiSpot — UI/UX, CSS & Responsive Design Overhaul Checkpoint

## 1. Scope & Completed Improvements

### Priority 1: Global Navigation Bar & Search Input Clipping (Issue A)
- **Root Causes Identified:**
  1. `src/components/HeaderSearch.tsx` applied hardcoded `pr-12` (`48px` right padding) even when the input was empty and the clear (`X`) button was not rendered, wasting `34px` of text display width.
  2. `src/components/AppShell.tsx` rendered 5 inline desktop links (`Dashboard`, `Holdings`, `Asset search`, `Watchlist`, `Price alerts`) plus `More v` on viewports `<1536px` and used a 33-character Bulgarian top-nav label for `/markets` (`"Търсене: компании, тикери, новини"`), compressing `.header-search-slot` down to `250px` at `1440px`, `163px` at `1280px`, and `95px` at `1024px`.
  3. `src/styles.css` unwrapped `.header-layout` into a single horizontal row at `@media (min-width: 1024px)` (`64rem`), leaving insufficient room for brand + nav + search + 8 right-hand utility controls at `1024px`.
  4. `src/components/CommandMenu.tsx` used `size-11` (`44px`) on the header trigger button while all adjacent utility icons used `size-9` (`36px`).
- **Fixes Implemented:**
  - `src/components/HeaderSearch.tsx`: Replaced static `pr-12` with conditional `${value ? "pr-9" : "pr-3.5"}`, recovering `34px` of usable placeholder width.
  - `src/components/CommandMenu.tsx`: Aligned header trigger button to `size-9` (`36px`).
  - `src/components/AppShell.tsx`:
    - Introduced concise top-bar labels for `/markets` (`en: "Asset search"`, `bg: "Пазари"`, `de: "Marktsuche"`, `es: "Mercados"`, `it: "Mercati"`) while keeping the full descriptive string in the footer.
    - Added `/watchlist` to the desktop `More v` menu (`Portfolio` group, alongside `/alerts`) and hid inline `/watchlist` and `/alerts` pills below `2xl` (`hidden 2xl:inline-flex`), keeping them 1 click away via `More v` on laptop screens and inline on `>=1536px` monitors.
  - `src/styles.css`:
    - Moved the single-row `.header-layout` breakpoint from `1024px` to `@media (min-width: 1280px)` with `.header-search-slot { min-width: 20rem }` (`320px`) at `1280px` and `min-width: 23rem` (`368px`) at `>=1440px`. At `1024px`, the search bar sits cleanly on Row 2 at `980px` full container width.

### Priority 1B: Holdings Search Input Clipping (`src/routes/holdings.tsx`)
- **Root Cause Identified:** The search input wrapper inside the Holdings card header was constrained to `sm:w-96` (`384px`) with static `pr-9`, clipping `"Search holdings or any ticker (META, VWCE.DE, BTC)..."` to `"Search holdings or any ticker (META, VWCE.DE, E"`.
- **Fix Implemented:** Expanded the Holdings search input wrapper to `w-full sm:min-w-[26rem] sm:flex-1 lg:max-w-lg` (`512px` on desktop) with `h-11 py-2` and conditional `${q ? "pr-9" : "pr-3.5"}`.

### Priority 2: Excessive Empty Space in Cards & Layouts (Issue B)
- **Root Causes Identified:**
  1. `Holdings Summary` (`1248px × 113px`) and `Allocation` (`1248px × 314px`) stacked vertically as full-width cards on `/holdings`, leaving ~80% of `Holdings Summary` blank and forcing the Holdings table below the fold.
  2. `src/components/AllocationCard.tsx` placed `<ShareAllocationButton>` in a separate bottom row (`mt-4 flex justify-end`), adding `52px` of empty vertical space below the donut and legend.
  3. `src/components/AllocationBreakdown.tsx` used a 50/50 split (`sm:grid-cols-2`), giving a `176px` donut a `540px`-wide column with ~`360px` of empty space, and rendered an empty `176px` `<PieChart>` when total allocation value was `0`.
  4. `src/styles.css` required `@container (min-width: 60rem)` (`960px`) for `.holdings-table`, which missed the `942px` inner card width on `1024px` laptops by `18px` and forced a `952px`-tall mobile card stack.
- **Fixes Implemented:**
  - `src/routes/holdings.tsx`: Paired `Holdings Summary` and `AllocationCard` side-by-side on desktop (`grid gap-4 lg:grid-cols-[minmax(18rem,0.72fr)_minmax(0,1.28fr)]`) and added a 3-metric bottom summary bar (`Invested`, `Total gain / loss`, `Holdings`) to `Holdings Summary` so both cards align at `250px` height.
  - `src/components/AllocationCard.tsx`: Moved `<ShareAllocationButton>` into the card header next to the `[Asset class | Sector | Region]` segmented control (`mb-3 flex flex-wrap items-center justify-between gap-2`).
  - `src/components/AllocationBreakdown.tsx` & `src/styles.css`:
    - Added `.allocation-breakdown-grid` (`@container (min-width: 26rem)` -> `10.5rem minmax(0, 1fr)`, `@container (min-width: 44rem)` -> `11.5rem minmax(0, 1fr)`) and `.allocation-legend-multi` (2-column legend when `>= 4` items).
    - Added a compact horizontal zero/partial-value empty state when `rows.length === 0 || total <= 0`.
    - Widened donut inner hole (`innerRadius="65%"`) and refined center overlay padding (`px-6`) so the total value never touches the inner ring.
  - `src/styles.css`: Lowered `.holdings-table` container query threshold from `60rem` (`960px`) to `56rem` (`896px`), enabling the desktop table at `1024px` (`height: 538px` vs `952px` before).
  - `src/routes/index.tsx` & `src/styles.css`: Added `min-w-0 flex-1` and `truncate` to Dashboard `Top Holdings` rows and consolidated duplicate `@media (prefers-reduced-motion: reduce)` rules.

---

## 2. Before vs. After Quantitative Measurements

| Viewport / Language | Metric | BEFORE | AFTER | Improvement |
| :--- | :--- | :--- | :--- | :--- |
| **1440px Desktop (`en`, dark/light)** | Global Header Search Width | `250px` (clipped) | `453px` (100% visible) | **+203px (+81%)** |
| **1440px Desktop (`bg`, dark)** | Global Header Search Width | `250px` (clipped) | `462px` (100% visible) | **+212px (+85%)** |
| **1440px Desktop (`de`, dark)** | Global Header Search Width | `250px` (clipped) | `440px` (100% visible) | **+190px (+76%)** |
| **1440px Desktop (`es` / `it`, dark)** | Global Header Search Width | `250px` (clipped) | `462px` (100% visible) | **+212px (+85%)** |
| **1440px Desktop (all 5 langs)** | Top Nav Scroll Overflow | `0px`–`73px` | `0px` across all 5 langs | **Zero overflow** |
| **1440px Desktop (all 5 langs)** | Holdings Search Input Width | `384px` (clipped) | `512px` (100% visible) | **+128px (+33%)** |
| **1440px Desktop** | Summary + Allocation Vertical Footprint | `113px + 16px + 314px = 443px` | `250px` (side-by-side grid) | **-193px (-44% vertical space)** |
| **1280px Laptop (`en`, dark/light)** | Global Header Search Width | `163px` (severely clipped) | `321px` (100% visible) | **+158px (+97%)** |
| **1280px Laptop (`bg` / `de` / `es` / `it`)** | Global Header Search Width | `163px` | `348px` / `318px` / `344px` / `350px` | **Unclipped across all 5 langs** |
| **1024px Laptop (`en`, dark)** | Global Header Search Width | `95px` (unusable) | `980px` (clean Row 2) | **+885px (+932%)** |
| **1024px Laptop (`en`, dark)** | Holdings Table Card Height | `952px` (mobile fallback) | `538px` (desktop table) | **-414px (-43% height)** |
| **768px / 430px / 390px / 360px** | Horizontal Page Overflow (`pageOverflow`) | `false` | `false` (`scrollWidth <= innerWidth`) | **Zero horizontal scroll** |

---

## 3. Separate Financial Data Investigation: Region Allocation (~98% Europe with S&P 500 ETF)

- **Observation:** In the owner's screenshot, `Allocation -> Region` showed `Europe 98.0%` and `North America 2.0%` while the portfolio held `SXR8.DE` (iShares Core S&P 500 UCITS ETF) and `AAPL`.
- **Root Cause in Code (Not Modified per Financial Guardrails):**
  - When a user adds an asset via `src/components/AddTransactionDialog.tsx` (line 238), the `assets` row is created with:
    `region: cur === "EUR" ? "Europe" : "Global"`
  - Because `SXR8.DE` is traded on Xetra in `EUR`, its stored `asset.region` defaults to `"Europe"` (representing **listing/trading currency region** rather than **underlying index geographic exposure** `"North America"`), even though `UCITS` in `src/lib/market-search.ts` (line 109) defines `SXR8.DE` with `index: "S&P 500"` and `domicile: "IE"`.
  - Meanwhile, CSV imports in `src/lib/PortfolioProvider.tsx` (line 906) default non-crypto assets to `"North America"`.
- **Recommended Dedicated Follow-Up:**
  1. Derive default `region` for known UCITS ETFs in `src/lib/market-search.ts` (`UCITS` catalog) from the underlying index (`"S&P 500"` / `"NASDAQ-100"` -> `"North America"`, `"MSCI World"` / `"FTSE All-World"` -> `"Global"`, `"STOXX Europe 600"` -> `"Europe"`) before falling back to currency/exchange.
  2. Add a clarifying tooltip on the `Region` pill in `AllocationCard` explaining whether region reflects underlying index exposure or listing domicile.

---

## 4. Product Video Presentation Inventory (Section 16 — Documented Only)

- **Wrapper Component:** `src/components/VideoPresentation.tsx`
  - Embedded on the signed-out landing page (`src/routes/index.tsx`) via an `<iframe>` loading `/video-preview/?mode=${activeMode}&theme=${theme}&lang=${lang}`.
  - Supports 2 interactive tour modes (`visitor`: "Portfolio tour", `pro`: "Pro tools"), synchronized with app theme (`dark`/`light`) and language (`en`/`bg`/`de`/`es`/`it`).
- **Static Player & Assets:**
  - `public/video-preview/index.html`
  - 10 slide screenshots in `public/video-preview/`: `ui-overview.png`, `ui-holdings.png`, `ui-import.png`, `ui-market-discovery.png`, `ui-dividends.png`, `ui-features.png`, `ui-fifo.png`, `ui-dcf.png`, `ui-pro-features.png`, `ui-pro-preview.png`, plus `public/hero-portfolio.png`.
- **Assets Needing Refresh After Production Approval:**
  - `public/video-preview/ui-holdings.png` and `public/hero-portfolio.png` still depict the pre-overhaul stacked Holdings Summary / Allocation layout and narrower search bars.

---

## 5. Preserved CapiSpot Growth Roadmap

1. **Completed Previously:** Admin Panel Pro grants, temporary trial grants, revocations, search across all auth user pages, and atomic PostgreSQL audit logging (`migration 0036`, live on `capispot.com`).
2. **Completed in This Overhaul (Staging):** Global Header & Holdings search unclipping across EN/BG/DE/ES/IT, side-by-side desktop `Holdings Summary + Allocation` layout, `1024px` container query table threshold, responsive zero-overflow containment across `360px–1920px`.
3. **Next Planned Initiatives:**
   - **Broker CSV Onboarding Funnel:** Expand guided CSV validation feedback and automatic region/underlying-index enrichment for UCITS ETFs (`SXR8.DE`, `VUAA.DE`, `VWCE.DE`).
   - **Landing Page & Video Preview Refresh:** Regenerate `public/video-preview/ui-*.png` and `public/hero-portfolio.png` from the updated UI once approved for production.
   - **SEO / Programmatic Asset Discovery Pages:** Continue expanding public `/asset/$symbol` and broker import guide interlinking.
   - **Pro Conversion & Trial Lifecycle:** Surface clear expiry countdown badges for temporary Pro grants issued via the Admin Panel.
