# Home + confirmation UI integration candidate

Reviewed on 15 November 2026. Branch: `review/home-auth-integration`.

## Included work

The integration branch combines Home `1fe3f1b0c98770d227093a9d413e650e5788ee1c` with confirmation-copy/visible-label candidate `5554f9eb2e3ce9c2dfffeaa84782e579f4bd1b82`, through integration merge `7a8e8f8`. Both originate from main `ddd47d320245843e862fc83d5d485bb72e9f86c1`. The source candidates remain unchanged.

Home retains the compact hero, eight curated companies, light circular logos, public-ticker selection cookie, SSR/client agreement and horizontal mobile scrolling. Confirmation wording explains the email link and optional code in five languages; the conditional code label remains visible above its input.

## Accessibility corrections found during integration QA

The first axe scan found four issues on the reviewed public path:

1. Language selection's accessible name omitted its visible EN/BG text. The name now includes the selected language code as well as the translated language label.
2. The password visibility button had an undersized hit target. It now has a minimum 44px width and 36px height, a visible keyboard focus ring and aria-pressed state.
3. The labelled Google button container lacked an appropriate semantic role. It now has role=group; this does not enable or reconfigure Google authentication.
4. The inactive mode button in the embedded walkthrough inherited the dark palette in light mode, with measured contrast about 2.05:1. Embedded mode buttons now use the existing theme-specific muted foreground; the active state styling is retained.

These fixes touch only AppShell, AuthForm and embedded walkthrough CSS. Portfolio calculations, billing, database access and provider configuration are unchanged.

## Validation on the combined final source

- Node 24.21.0 / npm 12.2.0; npm ci; no lockfile changes.
- TypeScript, full ESLint and diff check passed.
- Full Vitest: 77 files, 477 tests passed after the accessibility corrections.
- Local production-mode build passed using the integration-test configuration. The browser JS contains the integration-test Supabase URL and no production Supabase URL. This is a test artifact, not an approved production upload artifact.
- Chrome integration matrix: EN/BG × light/dark × 390/1440px. Each combination checked Home, signup and confirmation: 24 axe scans, zero reported violations after fixes for wcag2a/wcag2aa/wcag21a/wcag21aa/wcag22aa tags. Rules marked incomplete still require human review; automated scans are not a blanket accessibility certification.
- Each combination also checked eight unique suggestions, changed selection membership on reload, no-store Home response, one H1, selected document language, keyboard details disclosure, visible optional-code label, invalid-code feedback, return to password sign-in and no page overflow/page errors.
- Final built-artifact preview repeated representative mobile/light/EN Home, signup and confirmation checks: HTTP 200, interaction checks and three axe scans with zero violations. It was served locally, not deployed.
- Actual UI controls changed language and theme, then reload restored both preferences. Password show/hide and its pressed state worked. Mocked wrong-password, recovery and expired reset-session guards passed.
- Earlier standalone checks on unchanged source covered all five confirmation-copy languages at mobile/desktop and the broader Home widths 390/768/1366/1440. Those are recorded in HOME-AUTH-REVIEW-2026-11-15.md; the combined axe matrix above is specifically EN/BG.

## Backend and limits

Client and server use only the approved integration-test project. Public read-only auth settings confirmed signup enabled, email enabled, email confirmation required, and Google disabled on that test project. No settings were changed.

The user selected technical checks without a real confirmation email. All signup, OTP, password-login and recovery requests in automated browser scenarios were intercepted with fixture responses; Google Identity was stubbed. No account was created, no email was sent, no real login/OTP was completed, and no portfolio rows were written by these checks. Public provider FX reads remain real; the local warning about missing optional admin-backed persisted FX cache is known and was not hidden by adding an administrative key.

Not verified here: real email delivery/link redirects/login, real Google login, signed-in portfolio actions, physical touch devices, screen readers, field Core Web Vitals, or production settings/runtime. Real confirmation and login remain a release acceptance item when the user chooses to test with an accessible inbox. The separate Google-config candidate is not included. No claim is made about combining recovery/OAuth with this branch.

## Handoff and release boundary

Use `git fetch origin --prune` on the other laptop and inspect `origin/review/home-auth-integration`. Use a clean worktree and configure test env locally. Never copy office env files or browser sessions. The shared code and this report are in Git; screenshots, raw axe output and QA tooling remain ignored local artifacts.

Main, Home, the original confirmation candidates and preserved office release refs remain unchanged. Only this isolated integration branch was merged internally. Nothing was merged into main, deployed, migrated, scheduled, or changed in OAuth/payment settings.

Before publication: user visual acceptance, explicit merge/deployment authorization, real email flow verification or an explicitly recorded deferral, fresh runtime/rollback checks, a separately configured production build and checks of that exact upload artifact. Never upload the integration-test build as production. Recovery still requires its separate database backup/restore gates.
