# Separate auth review topics

## Confirmation email copy

`fix/auth-confirmation-copy` changes only `src/lib/auth-i18n.ts`, in all five supported languages. The message tells the user to follow the email link and return to sign in, or enter a code if the email actually contains one. The code label is conditional.

It does not change SMTP templates, verification methods, Supabase Auth settings, redirects, session handling or registration behavior. It does not establish that a production account exists in the separate integration-test project. No password, verification code or session belongs in source or review evidence.

## Google web client configuration

`review/google-oauth-config` independently adapts the product-only changes from the old local OAuth commit to main. It contains the config resolver, AuthForm integration, Vite wiring and regression tests; old evidence exports and env-template edits are excluded.

The supported browser build configuration names are:

```text
VITE_GOOGLE_WEB_CLIENT_ID
VITE_GOOGLE_STAGING_CLIENT_ID
VITE_GOOGLE_DEVELOPMENT_CLIENT_ID
```

A Google web client ID is a public identifier, not an OAuth client secret. The existing public production identifier remains in the resolver; no client secret or live token is added. Development/staging values are configured privately, not hardcoded from office env files. Staging rejects use of the production client identifier. Missing nonproduction configuration keeps that Google entry point unavailable rather than silently using the production client.

Review the resolver and AuthForm behavior before deciding whether to adopt it. Unit tests and typecheck do not prove a successful live Google sign-in. Allowed origins/redirects, provider-side settings, account consent and actual login remain separate environment checks. No Google, Supabase provider or production billing settings are changed by this branch.

Do not merge OAuth configuration just to obtain the email-copy wording: the branches have no dependency on each other or on the recovery release.
