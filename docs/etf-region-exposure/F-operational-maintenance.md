# F. Operational Maintenance Guide

## Adding or Refreshing an ETF Exposure Profile

1. **Where profiles live:** All canonical fund profiles are maintained in one typed registry: `FUND_EXPOSURE_REGISTRY` in `src/lib/geographic-exposure.ts`.
2. **Required metadata for any new entry:**
   - Verified ISIN(s) (`isins`) and exact exchange ticker listings (`listings`).
   - Official issuer source URL and `asOfDate` (`YYYY-MM-DD`).
   - Exact country percentages (`countries`) using ISO 3166-1 alpha-2 codes (`OTHR` for issuer-aggregated remainder, `CASHD_C` for fund cash/derivatives) — or `regions` only when the index mandate strictly restricts 100% of constituents to a single region (`STOXX Europe 600`, `S&P 500`).
   - Accurate `dataQuality` (`issuer-reported`, `verified-single-region`, or `benchmark-approximation`) and `isBenchmarkProxy` boolean.
3. **Refresh cadence:**
   - Issuer country factsheets should be reviewed **monthly or quarterly**. Profiles older than `staleAfterDays` (default `90` days) automatically surface a stale-data indicator via `isGeoProfileStale()`.
   - When adding a new share class (e.g., GBP vs EUR vs USD listing of the same UCITS fund), verify the ISIN and confirm whether the share class is **unhedged** (shares underlying portfolio) or **currency-hedged** (may use derivatives; add separate ISIN entry if exposure differs).
4. **Never guess:** If an ETF's country breakdown is unavailable or ambiguous, omit it from `FUND_EXPOSURE_REGISTRY` so CapiSpot explicitly classifies it as `Unknown` rather than displaying misleading percentages.
