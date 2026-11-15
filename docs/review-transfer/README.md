# Review branches — CapiSpot, 15 November 2026

This is a reviewed documentation summary for moving work between laptops. It contains no credentials, sessions, raw QA exports, customer portfolio data or machine-specific configuration.

## Start from the right history

`origin/main` is `ddd47d320245843e862fc83d5d485bb72e9f86c1`. The already-published production chain is:

| Commit | Scope |
| --- | --- |
| 0214193cdff680cad3f25ed8446988f5bb8d61e2 | Asset profile visuals, Company snapshot, sticky/focus, responsive Holdings, Sankey and Analyst outlook |
| 571bf9dca4f57f7ceb96c36a6e8a968b4f4cbfb9 | Header search at intermediate widths; AppShell and styles |
| 6125aa5549983c3f9da29461c63736c548110e61 | Dashboard legend and Holdings UX |
| ddd47d320245843e862fc83d5d485bb72e9f86c1 | Trading 212 guide and broker-specific demo CTA |

Do not cherry-pick these again. Main was updated by normal fast-forward push, without rewriting history.

## Independent review topics

| Branch | What to review | Status |
| --- | --- | --- |
| feat/home-popular-companies | Compact hero; eight companies; selected light-circle logo variant; SSR-safe reload selection | Existing commit 1fe3f1b0c98770d227093a9d413e650e5788ee1c; not duplicated |
| review/release-recovery | Journal ownership, atomic deletion/Undo, consistent portfolio snapshot/loading, cleanup code and pending SQL | Review only; migration/backup gates remain closed |
| review/google-oauth-config | Separate Google web client configuration by environment | Independent of release and Home; no provider changes applied |
| fix/auth-confirmation-copy | Link/code email-confirmation wording in five languages | Copy only; no auth/provider behavior change |
| docs/review-handoff | These curated notes and next tasks | No raw QA artifacts |

Each new topic is prepared on main, not on another review topic. Reviewing a branch is not approval to merge, deploy, apply SQL, enable Cron or change OAuth/payment settings. For combined testing, first agree on an explicit integration branch and check overlapping files.

The original local `preserve-release-e7a310e` still points to `e7a310e6ea55aac7f73aa2e4de16d5db8557fcc8`. The new release review branch contains a product-only adaptation of that work, not its historical evidence commits. The office `visual-company-snapshot` branch is not a production base.

## Laptop workflow

Start with `git status --short`, then `git fetch origin --prune`. Use a clean worktree for each topic, for example:

```sh
git worktree add ../capispot-home-review -b home-review origin/feat/home-popular-companies
git worktree add ../capispot-release-review -b release-review origin/review/release-recovery
```

If a local branch already exists or the worktree is dirty/diverged, inspect it first. Do not use force push, reset --hard or automatic history rewriting to make it match.

Use Node 24, npm 12.2.0 and `npm ci`. Client and server must use the same approved integration-test Supabase project before any QA write. Configure credentials separately through a secure channel. Production and integration-test accounts/sessions are distinct. Do not copy browser profiles, production admin keys or office env files into Git.

## Recent verified work

- Asset visual QA covered signed-in NVDA, Save/reload/cleanup of a test note, direct statistics hash/reload, snapshot layout and the financial diagrams. Touch was Chrome emulation; physical devices/screen readers were not generally covered.
- Holdings uses cards below 960px of content width, then the table. Filters, sorting and position actions remain accessible.
- The mixed-currency check found no new numerical regression in 6125aa5: totals/market value use portfolio currency, position P/L follows quote currency and is converted for aggregation.
- The MSFT.TO external logo 404 reproduced on both baseline and candidate with a working fallback and correct instrument selection. It is a known specific nonblocking issue, not a general exemption for Console errors.
- The Home review passed typecheck, focused ESLint, 58 related tests and 390/768/1366/1440 light/dark browser checks. This is not a statement that every later combination of review branches has passed the full suite.

Screenshots and large evidence are retained in a separate encrypted local archive. They are not dependencies of these branches and are not committed here. Environment files, caches, build output and sessions are excluded.

## Checks during this transfer

| Topic | Local checks |
| --- | --- |
| Recovery release | Typecheck, full ESLint, full local Vitest: 87 files / 558 tests; diff check |
| Google configuration | Typecheck, focused ESLint, Google configuration/AuthForm/routing: 3 files / 44 tests; diff check |
| Confirmation copy | Typecheck, focused ESLint, routing: 1 file / 35 tests; diff check |
| Curated documentation | File/link and diff review; no product runtime changes |

Changed-file snapshots are checked with checksum-verified Gitleaks 8.30.1, exact comparisons against available local credential values, and non-example-email detection. New commit ranges are scanned again before push. Scanner reports redact values. This is a scoped review, not a guarantee about every historical commit already present on origin/main. Live Google sign-in and remote migration/RLS verification are not claimed by the local test results.

See [release gates](RELEASE-GATES.md), [auth/OAuth scope](AUTH-AND-OAUTH.md) and [SEO next steps](SEO-NEXT.md).
