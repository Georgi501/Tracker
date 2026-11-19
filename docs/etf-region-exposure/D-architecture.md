# D. Architecture — Geographic Exposure Engine

## Layering & Responsibilities

1. **Canonical Engine (`src/lib/geographic-exposure.ts`)**
   - Pure TypeScript module, shared across client, SSR, and AI Advisor server payloads.
   - Zero network calls, zero Supabase imports.
   - **Country Normalization & Region Mapping:** Maps ISO codes and issuer/Yahoo country strings (e.g. `"United States of America"`, `"Korea (South)"`, `"Taiwan"`, `"Netherlands"`) to mutually exclusive `GeoRegion` buckets.
   - **Identity Resolution:** Resolves by verified ISIN first, then exact exchange listing symbol, then verified base UCITS symbol aliases (never blind `.split(".")[0]` stripping for arbitrary tickers). Distinguishes hedged/unhedged and total-market vs S&P 500 share classes.
   - **Data Provenance & Freshness:** Every resolved ETF/holding includes `dataQuality`, `source`, `sourceUrl`, `asOfDate`, `isBenchmarkProxy`, and staleness evaluation against `staleAfterDays`.
   - **Weighted Portfolio Look-Through:** `calculatePortfolioGeographicExposure(holdings, labelFn, options)` computes exact value-weighted regional exposure across ETFs, stocks, bonds, cash, and crypto while preserving the full portfolio denominator (`Unknown` and `Non-Geographic` slices are never dropped or rescaled).

2. **Overlap & Sector Unification (`src/lib/etf-overlap.ts`)**
   - Retains sector look-through and ETF overlap functionality.
   - Delegates `"region"` dimension in `calculatePortfolioExposures` and `compareEtfProfiles` to `src/lib/geographic-exposure.ts` so Analytics, `/etf-overlap`, Dashboard, and Holdings use one single source of truth.

3. **Cached Individual Equity Country Enrichment (`src/lib/market.functions.ts` + `PortfolioProvider.tsx`)**
   - New lightweight server function `getAssetCountries` resolves `yahooClient().quoteSummary(symbol, { modules: ["assetProfile", "quoteType"] })` ONLY for symbols not already resolved by the static ETF/verified-equity/crypto/cash registry.
   - 24-hour server-side in-memory cache (`ttl = 86_400_000`) avoids N+1 Yahoo requests.
   - Results enrich `Asset.country` in client memory (`PortfolioProvider`) non-blockingly without requiring any PostgreSQL schema migration.

4. **Safe Transaction & CSV Import Normalization (`csv-import.ts`, `AddTransactionDialog.tsx`, `PortfolioProvider.tsx`)**
   - `csv-import.ts` preserves `isin` when present in Trading 212 / Generic / IBKR CSVs and classifies catalogued UCITS ETFs as `assetType: "etf"`.
   - New transactions in `AddTransactionDialog.tsx` and `PortfolioProvider.tsx` no longer assign `"Europe"` from EUR currency or `"North America"` to every CSV non-crypto row; instead `initialAssetRegion(...)` writes neutral/verified metadata to `public.assets.region` while **on-read resolution** immediately corrects all legacy portfolios without database migrations.

5. **UI & Disclosure (`AllocationCard.tsx`, `analytics.tsx`, `i18n.ts`)**
   - `AllocationCard` (`mode === "region"`) uses `calculatePortfolioGeographicExposure`.
   - Displays concise data-quality breakdown (`Verified`, `Estimated`, `Non-Geographic`, `Unknown`), latest as-of date, and an accessible toggleable methodology explanation across all 5 languages (`en`, `bg`, `de`, `es`, `it`).
