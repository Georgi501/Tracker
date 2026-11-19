# E. Clean Release Validation & Verification Summary

**Validation Date:** `2026-11-19`  
**Release Branch:** `release/geo-clean` (branched cleanly from `origin/main` without third-party weight tables in Git history or build bundles)

## 1. Before vs After Release Behavior

| Instrument | Legacy Behavior (`AddTransactionDialog` / `csv-import`) | Clean Release Behavior (`release/geo-clean`) | Verification Notes |
| :--- | :--- | :--- | :--- |
| **`SXR8.DE` / `VWCE.DE` / `IWDA.AS` / `IS3N.DE`** | Misattributed as `Europe` (EUR currency) or `North America` (CSV heuristic) and saved as `stock` | Identified accurately (`etf`, ISIN preserved); third-party weights excluded -> **`Unknown`** (`license-restricted`) with transparent disclosure | Zero `EUR -> Europe` hallucination; zero unlicensed third-party tables in JS bundles or server responses |
| **`ASML` / `SAP.DE` / `AAPL`** | Assumed `North America` by USD currency or CSV heuristic | **`Reported HQ location`** (`NL -> Europe`, `DE -> Europe`, `US -> North America`) from public corporate HQ filings | Explicitly labeled as HQ location, distinct from corporate revenue geography or risk country |
| **`BTC` / `EUR Cash`** | Saved as `North America` / `Global` | **`Non-Geographic`** | Independent native asset-class classification |
| **`SYN500.DE` / `SYNGLOB.DE`** (synthetic cleared test fixtures) | N/A | Exact weighted look-through across mutually exclusive `GEO_REGIONS` preserving `OTHR` -> `Unknown` and `CASHD_C` -> `Non-Geographic` | Proves engine arithmetic, 100.0% Hamilton rounding, and denominator integrity without relying on unlicensed third-party numbers |
| **External `/api/public/asset-countries`** | Previously queried Yahoo `assetProfile.country` | Strict symbol validation, dedup, SSRF rejection (`400`), IP rate limiting (`RATE_LIMITED_PATHS`), conservative disabled provider response (`200 { countries: {}, disabled: true }`) | Zero unauthorized outbound provider calls in commercial runtime |
