# C. Instrument Identity & Source Governance Catalog

Distributable builds (`release/geo-clean`) store **public instrument identities only** (ISINs, exchange listings, issuer names, benchmark names, domicile codes, and commercial licensing status) in `FUND_EXPOSURE_REGISTRY` inside `src/lib/geographic-exposure.ts`. No third-party country or sector percentage tables are embedded in distributed source, bundles, test fixtures, or public documentation.

| Canonical ID | Share Class ISIN(s) | Verified Listings | Issuer | Reference Portal | Licensing Status | Commercial Release Handling |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `ishares-core-msci-world` | `IE00B4L5Y983` (Acc) | `IWDA.AS`, `EUNL.DE`, `SWDA.L` | BlackRock / iShares | [iShares UK](https://www.ishares.com/) | `restricted-website-terms` | Identity resolved; breakdown excluded (`Unknown` / `license-restricted`). |
| `ishares-core-msci-em-imi` | `IE00BKM4GZ66` (Acc) | `IS3N.DE`, `EIMI.L` | BlackRock / iShares | [iShares UK](https://www.ishares.com/) | `restricted-website-terms` | Identity resolved; breakdown excluded (`Unknown` / `license-restricted`). |
| `ishares-msci-acwi` | `IE00B6R52259` (Acc) | `IUSQ.DE`, `SSAC.L` | BlackRock / iShares | [iShares UK](https://www.ishares.com/) | `restricted-website-terms` | Identity resolved; breakdown excluded (`Unknown` / `license-restricted`). |
| `vanguard-ftse-all-world` | `IE00BK5BQT80` (Acc), `IE00B3RBWM25` (Dist) | `VWCE.DE`, `VWRA.L`, `VWRP.L`, `VWRL.AS` | Vanguard | [Vanguard UK](https://www.vanguard.co.uk/) | `restricted-website-terms` | Identity resolved; breakdown excluded (`Unknown` / `license-restricted`). |
| `vanguard-ftse-all-world-hdy` | `IE00B8GKDB10` (Dist) | `VHYL.AS`, `VHYD.L` | Vanguard | [Vanguard UK](https://www.vanguard.co.uk/) | `restricted-website-terms` | Identity resolved; breakdown excluded (`Unknown` / `license-restricted`). |
| `spdr-sp500-ucits` | `IE000XZSV718` (Acc) | `SPYL.DE`, `SPYL.AS` | State Street SPDR | [SSGA](https://www.ssga.com/) | `unclear-index-mandate` | Identity resolved; mandate excluded (`Unknown` / `license-restricted`). |
| `ishares-core-sp500-ucits` | `IE00B5BMR087` (Acc) | `SXR8.DE`, `CSPX.L` | BlackRock / iShares | [iShares UK](https://www.ishares.com/) | `unclear-index-mandate` | Identity resolved; mandate excluded (`Unknown` / `license-restricted`). |
| `vanguard-sp500-ucits` | `IE00BFMXXD54` (Acc), `IE00B3XXRP09` (Dist) | `VUAA.DE`, `VUSA.AS` | Vanguard | [Vanguard UK](https://www.vanguard.co.uk/) | `unclear-index-mandate` | Identity resolved; mandate excluded (`Unknown` / `license-restricted`). |
| `us-sp500-etfs` | `US9229083632`, `US78462F1030`, `US4642872000` | `VOO`, `SPY`, `IVV` | Vanguard / SSGA / iShares | [S&P DJI](https://www.spglobal.com/spdji/) | `unclear-index-mandate` | Identity resolved; mandate excluded (`Unknown` / `license-restricted`). |
| `vanguard-total-stock-us` | `US9229087690` | `VTI` | Vanguard | [Vanguard US](https://investor.vanguard.com/) | `unclear-index-mandate` | Identity resolved; mandate excluded (`Unknown` / `license-restricted`). |
| `spdr-msci-usa-scv` | `IE00BSPLC413` (Acc) | `ZPRV.DE` | State Street SPDR | [SSGA](https://www.ssga.com/) | `unclear-index-mandate` | Identity resolved; mandate excluded (`Unknown` / `license-restricted`). |
| `vanguard-total-bond-us` | `US9219378356` | `BND` | Vanguard | [Vanguard US](https://investor.vanguard.com/) | `unclear-index-mandate` | Identity resolved; mandate excluded (`Unknown` / `license-restricted`). |
| `stoxx-europe-600-ishares-de` | `DE0002635307` (Dist) | `EXSA.DE` | BlackRock / iShares | [STOXX](https://www.stoxx.com/index/sxxp/) | `unclear-index-mandate` | Identity resolved; mandate excluded (`Unknown` / `license-restricted`). |
| `stoxx-europe-600-amundi-lu` | `LU0908500753` (Acc) | `MEUD.PA` | Amundi | [STOXX](https://www.stoxx.com/index/sxxp/) | `unclear-index-mandate` | Identity resolved; mandate excluded (`Unknown` / `license-restricted`). |
| `xtrackers-msci-world` | `IE00BJ0KDQ92` (Acc) | `XDWD.DE` | Xtrackers / DWS | [MSCI](https://www.msci.com/) | `restricted-website-terms` | Identity resolved; breakdown excluded (`Unknown` / `license-restricted`). |
| `ishares-msci-world-ex-usa` | `IE000R4ZNTN3` (Acc) | `IXUA.DE`, `XUSE.L` | BlackRock / iShares | [MSCI](https://www.msci.com/) | `restricted-website-terms` | Identity resolved; breakdown excluded (`Unknown` / `license-restricted`). |
| `nasdaq100-ucits` | `IE00B53SZB19` (Acc), `IE0032077012` (Dist) | `SXRV.DE`, `CNDX.L`, `EQQQ.DE` | iShares / Invesco | [Invesco](https://www.invesco.com/) | `restricted-website-terms` | Identity resolved; breakdown excluded (`Unknown` / `license-restricted`). |
| `qqq-nasdaq100` | `US46090E1038` | `QQQ` | Invesco | [Invesco](https://www.invesco.com/) | `restricted-website-terms` | Identity resolved; breakdown excluded (`Unknown` / `license-restricted`). |

## Distribution Safety Guarantee
- Authorized/cleared custom `FundExposureEntry` records (`redistributionCleared: true`) can be plugged into `resolveInstrumentGeoProfile(..., { registry })` once a commercial data license is executed.
- External Yahoo Finance `assetProfile.country` redistribution is disabled in `src/lib/asset-countries.server.ts` until commercial rights are established.
- Equities covered by `REPORTED_EQUITY_HQ_COUNTRIES` resolve strictly as `"Public corporate HQ filing"` (`Reported HQ location`), explicitly distinguished from revenue exposure and country-of-risk.
