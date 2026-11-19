# B. Geographic Methodology & Taxonomy

## 1. Core Distinctions

CapiSpot enforces strict separation between four distinct concepts:

- **Exchange / Listing Location:** Where shares trade (e.g., Xetra in Germany `.DE`, London `.L`, Amsterdam `.AS`). **Never determines geographic exposure.**
- **Trading Currency:** Quote or settlement currency (`EUR`, `USD`, `GBP`, `CHF`). **Never determines geographic exposure.**
- **Fund Legal Domicile:** Jurisdiction where a UCITS/mutual fund is legally domiciled (`IE`, `LU`, `DE`, `US`). **Never determines geographic exposure.**
- **Underlying Investment Exposure:** Country/region weights of the fund's underlying securities (for funds/ETFs) or verified company country of risk/domicile (for individual equities). **This is the sole basis of CapiSpot's Geographic Exposure view.**
- **Revenue Exposure:** Geographic split of corporate revenues (not used here; geographic attribution explicitly represents underlying issuer/security exposure, not corporate revenue geography).

## 2. Country-Level Foundation & Mutually Exclusive Region Taxonomy

Internal exposure profiles use **ISO 3166-1 alpha-2 country codes** whenever country data is available, plus explicit non-country buckets (`OTHR` for issuer-aggregated smaller markets without per-country weights; `CASHD_C` for fund-held cash and/or derivatives).

Countries aggregate deterministically into mutually exclusive geographic regions (`GeoRegion`):

| Region (`GeoRegion`) | Included ISO Countries | Notes |
| :--- | :--- | :--- |
| `North America` | `US`, `CA` | Does not include Latin America (`MX` classified in Latin America per institutional equity convention) |
| `Latin America` | `BR`, `MX`, `CL`, `CO`, `PE`, `AR`, `PA`, `UY` | Explicit institutional separation of Mexico from US/Canada |
| `Europe` | `GB`, `CH`, `DE`, `FR`, `NL`, `IE`, `SE`, `DK`, `IT`, `ES`, `FI`, `BE`, `NO`, `AT`, `PT`, `LU`, `PL`, `GR`, `CZ`, `HU`, `RO`, `BG`, `IS` | Based on geography, NOT EU membership (`GB`, `CH`, `NO` are Europe) |
| `Asia-Pacific` | `JP`, `AU`, `NZ`, `HK`, `SG`, `TW`, `CN`, `KR`, `IN`, `ID`, `TH`, `MY`, `PH`, `VN`, `PK` | Includes both Developed APAC (`JP`, `AU`, `HK`, `SG`) and Asian EM (`TW`, `CN`, `KR`, `IN`) without overlapping an "Emerging Markets" bucket |
| `Middle East` | `IL`, `SA`, `AE`, `QA`, `KW`, `BH`, `OM`, `JO`, `TR` | UN M49 Western Asia + Middle East markets (Turkey `TR` documented here consistently) |
| `Africa` | `ZA`, `EG`, `MA`, `NG`, `KE`, `MU` | African equity markets |
| `Non-Geographic` | Crypto (`BTC`, `ETH`, ...), Cash (`USD`/`EUR` cash), fund `CASHD_C` (cash & derivatives) | Distinguished from missing/unknown equity data |
| `Unknown` | Unverified equities/ETFs/bonds, or issuer `OTHR` residual spanning multiple continents | Never fabricated or rescaled |

**Critical rule:** `"Emerging Markets"` and `"Global"` are **never** geographic regions in the pie chart. `"Emerging Markets"` is a development-tier classification; `"Global"` describes fund scope, not a continent.

## 3. ETF Look-Through & Portfolio Denominator Rule

Given valued holdings $H_i$ with positive market value $V_i > 0$ and total portfolio market value $V_{\text{total}} = \sum_i V_i$:

- If holding $i$ resolves to a verified exposure profile with regional weights $w_{i,r} \ge 0$ (summing to $1$, including `Non-Geographic` and `Unknown` where applicable):
  $$\text{Contribution}_{i,r} = V_i \cdot w_{i,r}$$
- **Critical Denominator Rule:** If an authorized breakdown covers less than $100\%$ in named countries (e.g., an issuer's top-$N$ cutoff plus an `OTHR` residual), CapiSpot **does NOT rescale the partial total up to $100\%$**. The unallocated residual remains explicitly attributed to `Unknown` (and fund cash/derivatives to `Non-Geographic`), preserving the exact portfolio denominator $V_{\text{total}}$.
- Legacy database values (`asset.region`) such as `"Europe"`, `"North America"`, or `"Global"` are **never** used to overwrite verified exposure or fill missing data on unknown or license-restricted funds.
