# A. Root Cause Analysis — Geographic Allocation Engine

**Date:** 2026-11-19  
**Audit Baseline Commit:** `6c0eb6c43dff2a19c51d138aec1765d896d0b751`  

## Confirmed Root Causes

1. **Currency-derived region on manual transaction creation**  
   - **Location:** `src/components/AddTransactionDialog.tsx:238`  
   - **Code:** `region: cur === "EUR" ? "Europe" : "Global"`  
   - **Failure:** Any ETF or non-European security purchased in EUR (such as `SXR8.DE` iShares Core S&P 500 UCITS ETF on Xetra) is persisted into `public.assets.region` as `"Europe"`. A portfolio holding `SXR8.DE` in EUR incorrectly renders as ~98–100% Europe.

2. **Blanket `"North America"` assignment & mis-typed ETFs on CSV import**  
   - **Location:** `src/lib/PortfolioProvider.tsx:906` and `src/lib/csv-import.ts:186, 273, 381`  
   - **Code:** `region: r.assetType === "crypto" ? "Global" : "North America"` and `guessType(symbol)` returning `"stock"` for all non-crypto CSV rows (including `trading212()` and `ibkr()`).  
   - **Failure:** Every CSV-imported European stock, UK ETF, emerging-market ETF, or global UCITS ETF is stored as `"North America"` with `type = "stock"`. Trading 212's `ISIN` column is also discarded during CSV parsing.

3. **`AllocationCard` (Dashboard & Holdings) ignores ETF look-through and country resolution**  
   - **Location:** `src/components/AllocationCard.tsx:12-18`  
   - **Code:** `groupBy(p.holdings.filter((h) => Number.isFinite(h.value)), (h) => p.label(mode === "sector" ? h.asset.sector : h.asset.region))`  
   - **Failure:** Directly groups by persisted `asset.region` (which holds legacy poisoned `"Europe"` / `"North America"` / `"Global"` labels) and performs zero ETF look-through, zero country attribution, and zero unknown/quality disclosure.

4. **Naive Look-Through Engine & Taxonomy Conflation in Analytics**  
   - **Location:** `src/lib/etf-overlap.ts:35-174`, `src/routes/analytics.tsx:378-404, 1232-1260`  
   - **Failures:**
     - `calculatePortfolioExposures` only checks `SUPPORTED_ETF_EXPOSURE_PROFILES` when `holding.asset.type === "etf"`, missing CSV-imported UCITS ETFs persisted as `"stock"`.
     - `ALL_WORLD_REGIONS` mixes `"Emerging Markets": 0.1` alongside geographic continents, creating overlapping non-mutually-exclusive categories (e.g., Taiwan/China/India are in Asia-Pacific yet separated into an index-tier bucket).
     - Static exposure weights lacked ISIN provenance, source URLs, as-of dates, country breakdowns, and explicit `Unknown` / `Non-Geographic` tracking.
     - `resolveEtfExposureProfile` uses `upper.split(".")[0]` unconditionally, risking ticker collision across unrelated exchange listings.
     - Fallback on unsupported ETFs silently reuses poisoned `holding.asset.region`.
     - `analytics.tsx` renders `sectorExposure.decomposedEtfs` / `fallbackEtfs` notice globally for both Sector and Region charts.

5. **Unused Server-Side Equity Country Metadata**  
   - **Location:** `src/lib/market.functions.ts:938-960`  
   - Yahoo Finance `quoteSummary` (`assetProfile.country`) accurately distinguishes issuer country even for foreign ADR listings (verified: `ASML` on NASDAQ returns `country: "Netherlands"`, `SAP.DE` returns `"Germany"`, `AAPL` returns `"United States"`), but this data was never connected to portfolio geographic attribution.

6. **AI Advisor Payload Consumes Legacy `asset.region`**  
   - **Location:** `src/lib/ai-portfolio.server.ts:154, 215, 261`  
   - Sends raw `asset.region` from DB to the AI Advisor context rather than derived canonical geographic exposure.
