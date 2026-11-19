# H. Licensing Compliance Matrix & Production Release Safety Gate

**Audit Date:** `2026-11-19`  
**Platform Model:** Commercial freemium SaaS (`capispot.com`)  
**Release Strategy:** Zero unlicensed third-party percentage tables embedded in code, bundles, test fixtures, or release Git history; fail-closed fallback (`license-restricted` / disabled external equity lookup).

## 1. Source-by-Source Licensing Matrix

| Data Source | Fund / Scope | Intended Use | Documented Applicable Usage Terms | Permission Status | Release Treatment on `release/geo-clean` |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **BlackRock / iShares** | `IWDA`, `IS3N`, `IUSQ` | Fund identity & historical research reference | iShares T&C restrict website data to personal/internal use; prohibit commercial use, copying, publishing, redistribution, derivative works ([ishares.com](https://www.ishares.com/uk/individual/en/help/terms-and-conditions)) | **Restricted** | **Tables removed** from code/bundles/history; fund identity preserved -> `Unknown` (`license-restricted`) |
| **Vanguard UK** | `VWCE`, `VHYL` | Fund identity & historical research reference | Vanguard Terms grant limited personal, non-commercial license; prohibit copying, redistribution, commercial exploitation ([vanguard.co.uk](https://www.vanguard.co.uk/professional/terms-of-use)) | **Restricted** | **Tables removed**; identity preserved -> `Unknown` (`license-restricted`) |
| **MSCI** | `XDWD`, `IXUA` | Benchmark factsheet reference | MSCI Terms restrict public data to non-commercial informational use; prohibit reproduction, redistribution, public dissemination ([msci.com/legal](https://www.msci.com/legal)) | **Restricted** | **Tables removed**; identity preserved -> `Unknown` (`license-restricted`) |
| **Invesco / SSGA / Index Providers** | `SXRV`/`EQQQ`/`QQQ`, `SXR8`/`SPYL`/`VUAA`/`VOO`/`SPY`/`IVV`/`VTI`/`ZPRV`/`BND`/`EXSA`/`MEUD` | ETF & index identity classification | Website T&C and index trademark/methodology rights restrict third-party commercial reproduction without written authorization | **Restricted / Unclear** | **Mandate & percentage tables removed**; identity preserved -> `Unknown` (`license-restricted`) |
| **Yahoo Finance (`assetProfile.country`)** | Equity country lookup | Dynamic company country resolution | Standard Yahoo ToS prohibit unauthorized commercial redistribution/scraping; commercial rights for `assetProfile` redistribution are unverified | **Unclear / Unverified** | **Disabled** in `asset-countries.server.ts` & removed from client calls; conservative fallback active |
| **Native Asset Classes** | Cash & Crypto | `Non-Geographic` classification | Independent asset-class rule (no third-party tables/IP) | **Confirmed** | **Active** (`Non-Geographic`) |
| **Public Corporate HQ Filings** | Curated public issuers | Reported company headquarters (`HQ`) | Public factual corporate registration metadata, explicitly labeled as HQ location (distinct from revenue/economic risk) | **Confirmed** (Factual HQ metadata) | **Active** (`Public corporate HQ filing` -> `Reported HQ location`) |
