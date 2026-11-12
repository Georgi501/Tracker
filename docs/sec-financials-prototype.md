# SEC Financials research prototype

This command audits annual US company financials independently of the application.
The audit runner is not imported by the app. Its parser is shared with the server-only Annual provider in src/lib/sec-financials.server.ts. The app uses SEC for supported USD US-GAAP companies and a separately labelled Yahoo series for unsupported companies. SEC request failures remain errors; data providers are never stitched. Historical EPS is withheld in the app until split adjustments are verified; the audit retains raw EPS with filing provenance. Quarterly and TTM remain Yahoo-backed.

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
  FCF normally subtracts cash PP&E purchases from CFO and is marked derived. NVIDIA (CIK 1045810) uses its reported productive-asset purchases plus financed-asset principal payments; all three facts must match the filing and exact period.
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

### NVIDIA FCF coverage

The production provider additionally reads NVIDIA's primary inline-XBRL 10-K
from the SEC accession directory. It accepts only the audited
`nvda:PaymentsForFinancedPropertyPlantAndEquipmentAndIntangibleAssetsFinancingActivities`
extension, with a verified NVIDIA CIK context, USD unit and unsegmented duration.
The directory must contain one `nvda-YYYYMMDD.htm` primary document. Unsupported
older document names, unavailable files and unsupported inline transformations
leave FCF unavailable while preserving the other company metrics.

Fiscal 2026 reconciliation (USD millions): 102,718 operating cash flow minus
6,042 productive-asset purchases minus 101 financed-asset principal payments
= 96,575 free cash flow, matching NVIDIA's published reconciliation:
https://investor.nvidia.com/news/press-release-details/2026/NVIDIA-Announces-Financial-Results-for-Fourth-Quarter-and-Fiscal-2026/
No missing payment is treated as zero. Productive-asset purchases are now handled as a distinct component with an explicitly labelled calculation, rather than as a PP&E alias. See [current validation coverage](financial-data-validation.md).