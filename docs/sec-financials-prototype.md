# SEC Financials research prototype

This prototype audits annual US company financials without changing CapiSpot's market provider.
It is intentionally not imported by app routes or server functions.

## Run locally

Requires Node 22.18+ (TypeScript type stripping), installed project dependencies and network access to SEC.

```powershell
node scripts/sec-financials-prototype.mjs --as-of 2026-11-12
```

Outputs: `artifacts/sec-financials.local/report.md`, exact-value CSV files, JSON with per-metric
tags/units/start/end/filing dates/accessions and original-filing verification. The `.local` directory
is ignored by the existing Git rules. Original Company Facts and 10-K files are cached there.

Optional comparison with the current Yahoo annual implementation:

```powershell
node scripts/sec-financials-prototype.mjs --as-of 2026-11-12 --compare-yahoo
```

Use `--cache-dir PATH` to reuse a downloaded SEC snapshot, `--out-dir PATH` to choose an output
directory, or `--refresh` to fetch fresh source documents. Cutoff date filters both period ends
and filing dates. Network errors and unavailable filing checks are reported, not treated as matches.

## Scope and policy

- ORCL, AAPL and MSFT test different fiscal calendars and changing revenue tags; JPM tests bank limitations.
- Only whole-entity standard US-GAAP, USD monetary facts and USD/share diluted EPS from 10-K/10-K/A.
- Annual duration 350–380 days includes 52/53-week years. Quarterly/YTD, transition periods,
  custom tags, invalid dates, conflicting values and ambiguous annual starts are not guessed.
- Period labels use actual start/end dates. The `fy` of a later filing does not relabel comparative years.
- The latest disclosed value available by the cutoff date wins; provenance is retained.
- Derived gross profit and FCF require matching source filing and exact reporting period.
  FCF is CFO minus cash payments for PP&E and is clearly marked derived.
- Diluted EPS remains as disclosed; historical split normalization is a prerequisite for production use.
- Latest available 10-K is checked separately against its inline XBRL values and matching contexts.
  Check the report for any unresolved verification status; a successful API fetch is not proof of a match.
- This is a coverage and mapping experiment, not a validated universal financial-statement adapter.
  SEC/Yahoo differences are exposed, never silently merged.

## Sources

- https://www.sec.gov/search-filings/edgar-application-programming-interfaces
- https://www.sec.gov/about/developer-resources
- https://data.sec.gov/api/xbrl/companyfacts/CIK0001341439.json

Requests identify CapiSpot with the public support contact, run sequentially at at most 2/second,
cache responses and stop on HTTP errors. No API key, account credentials, portfolio rows or database access.
