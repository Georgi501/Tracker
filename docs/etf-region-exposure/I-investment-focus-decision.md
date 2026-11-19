# I. Investment Focus — decision record (2026-11-19)

## Problem
An ETF-heavy portfolio rendered ~98.5% "Unknown / Unclassified" in Region. The engine was right not to
invent weights, but the UI merged three different situations into one label.

## What was conflated
| Situation | Before | After |
| --- | --- | --- |
| Fund identified, country split not displayable | Unknown | "Fund · no country split" (grey) + CTA to Focus tab |
| Instrument not identified | Unknown | "Unidentified" (grey) |
| Residual inside an available breakdown | Unknown | "Unallocated" |
| Fund mandate known, no percentages | not shown | **Focus tab** (no percentages inside a fund) |

## Data categories (A–H)
| Category | Status |
| --- | --- |
| A Fund mandate (benchmark scope) | Public product fact; used as a label. Legal clearance NOT confirmed by counsel — treat as unconfirmed for nominative use of index names. |
| B Domicile / C exchange / currency | Facts, never used for exposure. |
| D Underlying country allocation | Issuer tables are restricted (T&C); not stored. |
| E Benchmark country weights | Index-provider restricted; not stored. |
| F Issuer historical tables | Restricted; not stored. |
| G Instrument identity (ISIN, name) | Stored in registry. |
| H User-supplied holdings files | Viable (client-side, private); not implemented — see below. |

## Decision matrix (summary)
| Approach | Accuracy | Rights | Cost | Effort | Verdict |
| --- | --- | --- | --- | --- | --- |
| A Verified mandate / focus | scope only, no % | low risk, counsel to confirm | 0 | low | **Implemented** |
| B Licensed data/API | high | needs contract | paid | med | Needs approval |
| C Derived from filings | high | SEC N-PORT is public domain, but covers US-registered funds only; UCITS have no public structured holdings filing | 0 | high | Future, US-listed ETFs only |
| D User upload (client-side) | user-dependent | user's own rights | 0 | med-high | Deferred; needs spec + privacy review |
| E Progressive precision | — | — | — | — | Levels 1 and 5 now; 3 once data is licensed |

## Precision levels in the product
1. Focus (verified mandate, no %) — Focus tab. 2. Company HQ (equities) — Region tab. 3. Fund country weights — only via `redistributionCleared` registry entries (none shipped). 4. Benchmark approximation — not enabled. 5. Unknown/Unclassified.
Focus and Region never share one chart.

## Primary-focus rule
One focus per fund from the stated benchmark scope; stocks from reported HQ (US→United States, Europe→Europe, else "Other single markets"). Limitations: Nasdaq-100 is listing-based (may hold non-US issuers, flagged in UI); the US bond fund maps to "United States" market scope (fixed income); FTSE All-World HDY has global scope with different weights than its parent.

## Instrument validation
Web-checked 2026-11-19 (name/ISIN/benchmark): SPYL (IE000XZSV718), SXR8 (IE00B5BMR087), VUAA (IE00BFMXXD54), VWCE (IE00BK5BQT80), IWDA/EUNL (IE00B4L5Y983), IXUA (IE000R4ZNTN3), IS3N (IE00BKM4GZ66), SXRV (IE00B53SZB19), XNAS (IE00BMFKG444, added — previously unresolved), EXSA (DE0002635307). Remaining catalog entries stay marked `catalog-only` in the UI until re-checked against issuer pages. Search summaries are not primary sources; re-verify against issuer KIDs before production.

## Not done
No Playwright in the repo and no network/credentials in this session: browser screenshots and Cloudflare staging deploy were not performed.
