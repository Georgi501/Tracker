# Home and confirmation-copy review — 15 November 2026

## Reviewed candidates

- Home: `feat/home-popular-companies`, `1fe3f1b0c98770d227093a9d413e650e5788ee1c`.
- Confirmation wording: `fix/auth-confirmation-copy`, `07d3914b02dab0882663dfe5c6c9ad35a43c076d`.
- Common main: `ddd47d320245843e862fc83d5d485bb72e9f86c1`.

Both candidates were reviewed independently. No blocking defect was found in the reviewed Home changes. The confirmation-copy review found a mobile presentation issue: the longer conditional code label was clipped when used only as an input placeholder. This follow-up adds a persistent, wrapping native label associated with the field through React useId, and removes the placeholder and redundant aria-label. It reuses the existing translations in all five languages. Verification logic, registration behavior, code format and provider configuration are unchanged.

This branch builds on the original confirmation-copy commit; it is an alternative candidate including that commit plus the label correction. Do not apply the original archived copy patch again. No Home code is included here.

## Validation

### Confirmation copy and label correction

- Clean dependency install with Node 24.21.0 and npm 12.2.0; lockfile unchanged.
- TypeScript, ESLint for AuthForm/auth-i18n, and diff check passed.
- Existing app-routing test file passed: 35 tests, after the correction.
- Headless Chrome passed all ten combinations: EN/BG/DE/ES/IT at 390px and 1440px.
- Checked link/code instructions, persistent accessible code label, disabled empty-code submission, invalid-code feedback, return to password sign-in and absence of page overflow/page errors.
- Browser auth requests were intercepted with local fixture responses. No user was registered, no email was sent, no real OTP was verified, and Google Identity was stubbed. These checks demonstrate UI behavior, not end-to-end email delivery or real authentication.
- Browser/server configuration used the approved integration-test project; production credentials and sessions were not copied.

### Home

- Earlier verification in the same home-machine session passed TypeScript, full ESLint and the full Home Vitest suite: 477 tests in 77 files. Home source has not changed since those checks. Remote Verify CI for the reviewed Home SHA also passed.
- Earlier Chrome matrix: 390/768/1366/1440 × light/dark, eight unique companies, matching SSR/client selection, changed membership on reload, keyboard focus, no page overflow/page errors, real logo loading, forced-404 fallback and correct asset navigation.
- Additional checks in this review passed EN/BG × 390/1440: keyboard disclosure opening/closing, allocation visibility, 1M/1Y period controls, narrow-screen list scrolling and preserved standalone-demo allocation visibility.
- The local Home response returned HTTP 200 with `Cache-Control: private, no-store`.
- Reviewed selection uses only the existing public stock pool and a public-ticker cookie. The compact sample remains explicitly illustrative. Shared logo fallback and source-dimension handling were reviewed.

## Review limits and next steps

No live email-confirmation flow, real Google sign-in, signed-in portfolio write or physical-device/screen-reader test was performed in this review. The remote auth-copy CI result applies to the original candidate; this follow-up has its own CI run after push. The reported 35 local tests are not the entire suite for this follow-up.

Home and confirmation copy were not merged together, and no combination with OAuth or recovery was tested. Home/recovery both touch src/routes/index.tsx. This follow-up and the OAuth candidate both touch AuthForm.tsx; inspect that overlap before any agreed integration.

Main, Home, the original auth-copy candidate and the preserved historical release refs remain unchanged. No merge, deployment, migration, scheduler change or provider/payment setting change was performed. Production backup/restore and recovery rollout gates remain closed. User review and explicit authorization for any subsequent merge/deployment are still required.
