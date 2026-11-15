# Pending recovery release: review gates

The `review/release-recovery` branch is a source review candidate, not a deployable approval. It adapts the product changes from the preserved e7 release to the published main base and excludes its historical QA JSON/Markdown evidence.

## Product scope

- Owner/asset-scoped journal state.
- Atomic position deletion, recovery receipt, Undo and notices.
- Consistent portfolio snapshot and pagination for large portfolios.
- Independent access/Pro loading; explicit history/data failure states; quote batching.
- Scheduled cleanup code and proposed Worker configuration.
- Local regression tests, including isolated PGlite SQL tests.

Published responsive Holdings cards/table and actions were retained when adapting the old recovery changes. The overlapping card-action block adds the recovery in-flight disabled guard while preserving the published touch target, label, Lots control and keyboard focus styling.

## Required database changes — not executed by this review

```text
drizzle/migrations/0033_atomic_position_deletion.sql
supabase/migrations/20261113122247_portfolio_snapshot.sql
```

The recorded production preflight stopped because there was no confirmed accessible backup/PITR restore point or successfully rehearsed logical restore. It found the existing 0032 effect and did not repeat it. No pending production SQL was applied. Those historical findings must be rechecked before a future release.

## Before any future rollout

1. Confirm the exact production project, source/artifact and current Worker rollback version.
2. Establish a protected database backup and demonstrate a restore in an isolated environment, including required schema/roles/data coverage.
3. Repeat read-only schema/RLS/grant checks and approve the exact migration source/order.
4. Verify the independent expired-recovery cleanup plan for both forward rollout and rollback. A rollback Worker without the scheduled handler must not silently stop cleanup.
5. Agree on a separate migration, scheduler and app deployment plan. Keep secret values out of source and reports.
6. After explicit authorization, apply the approved steps with their individual stop/rollback conditions. This review does not execute them.

The proposed Cron entry in versioned configuration is part of code review. Pushing the branch does not configure a remote schedule. Do not deploy it just to inspect the UI.

The five-day trial and real production payment-to-Pro behavior remain separate unverified release scenarios. Historical sandbox payment/webhook success is not proof of live billing.

Local unit/SQL tests do not substitute for the backup/restore gate, remote RLS integration checks or a fresh authenticated staging session after integration. The original preserve-release ref remains unchanged.
