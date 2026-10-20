# Polar organization cutover (local implementation, not deployed)

## Required deployment order

1. Apply the shared firstcrack database migration `20261020133500_polar_org_cutover.sql` owned by the Edge implementation, after database review. Its billing SQL is unchanged; only the pending migration's version was moved after the existing history. The migration must follow the already-applied database history, including unrelated version `20261020071807` from `feat/profile-roast-sources`. The Edge PR includes that exact already-applied SQL file only to keep local migration files aligned with existing history for normal `db push`; the profile feature is not re-executed, and no migration repair/history edits are required. This repository intentionally does not duplicate that migration. Required objects: service-role-only `billing_customers` and atomic `apply_polar_subscription_event(p_org_id,p_event_id,p_event_at,p_user_id,p_customer_id,p_subscription,p_plan)` RPC, event ledger and organization-aware subscription state. Migration must backfill old subscriptions/customers and preserve legacy active entitlements. Do not deploy this handler before that migration.
2. Keep `POLAR_WEBHOOK_SECRET` unchanged. Add `POLAR_WEBHOOK_SECRET_NEW` for the new firstcrack endpoint. Keep the new organization token in `POLAR_ACCESS_TOKEN`; put the old organization token in `POLAR_LEGACY_ACCESS_TOKEN`. Both optional additions are declared in Astro schema. No secret values belong in source or command output.
3. Wrangler contains six new monthly IDs and six explicitly empty yearly IDs. Enterprise is disabled regardless of environment `_SBX`/`_PROD` overrides. Runtime overrides for checkout respect explicit empty strings.
4. Both `/api/webhook/polar` and `/api/webhooks/polar` use the same verifier and RPC ledger. Organization is determined by the verified secret, not customer metadata. Both secrets matching is rejected as ambiguous.

Old org: `f0ef6666-e89c-4a50-8808-78ff4b4d3a1d`. New org: `3b6494cb-8248-47d1-a5f2-65ff7ca9b8a8`.

## Compatibility and behavior

- Legacy monthly/yearly IDs remain webhook catalog entries, not checkout fallbacks.
- External customer UUID and metadata user UUID must agree when both exist; explicit invalid/conflicting identities fail closed. Missing identities pass null to the service-role RPC, which can resolve only an existing trusted organization/customer mapping. A Polar customer ID is never treated as an app user UUID. Unknown products cannot grant paid access: nonterminal transitions are rejected, while terminal revoked/ended events can revoke a mapped subscription with null incoming plan.
- Shared RPC owns duplicate/stale handling and cross-organization entitlement recomputation. Revocation uses terminal `revoked`; future-period cancellation retains benefits.
- Billing portal uses authenticated server-side customer mappings and the matching organization's server token. `?organization=<known-org-uuid>` permits selecting the legacy portal. No client token is accepted, and there is no cross-org retry.
- Subscription-created and order-paid Slack notifications now use shared durable `claim_polar_notification` / `finish_polar_notification` RPCs in the Edge migration. The canonical first-enqueued payload is sent, with a 60-second ownership lease. Slack remains optional: when unconfigured, notices are explicitly disabled, no outbox entry is created, and valid billing events ACK normally. When configured, busy lease, failed send, or unconfirmed finish returns retryable 503, never successful ACK. Sent notices ACK without re-sending. Safe Sentry and existing best-effort Slack billing-error reporting are restored; error alerts do not use the payment-only outbox.
- Yearly checkout is intentionally unavailable; existing marketing pricing UI may still display yearly prices, but the server rejects checkout when the ID is empty.

## Local validation

`node apps/landing/tests/polarWebhook.test.mjs`: 22 assertions (Standard/legacy signatures including full whsec_ UTF-8 only on old slot, tampering, expiry, mapped/missing/conflicting identity, terminal unknown products, uncancel/cancel normalization, organization mismatch, trial projection).

`node apps/landing/tests/polarCatalog.test.mjs`: 46 assertions (new IDs, legacy mapping, explicit empties, Enterprise variants, unknown product).

Build was attempted after frozen-lockfile install. Native esbuild was killed by macOS policy; after ignore-scripts linking, Rollup native library loading was rejected by system code-signing policy. A clean trusted build environment is required before deployment. No native signing or security-policy changes were made. Database integration/concurrency tests remain dependent on the shared migration and an isolated database; no live database was modified.

CI and deployment gates: `.github/workflows/ci.yml` and `.github/workflows/deploy-landing.yml` run `pnpm --filter @fc/landing test:billing` as a mandatory step before builds/deployment. Node 22 uses `--experimental-strip-types`. Tests cover signature/catalog plus 23 notification assertions with mocked RPC/send failures, canonical payload, duplicate, lease contention and stale finish. Database outbox concurrency coverage is owned by the shared Edge migration suite.

Outbox deployment requirement: `claim_polar_notification(p_org_id,p_event_id,p_payload)` returns `{status,lease_id,payload}`; `finish_polar_notification(p_org_id,p_event_id,p_lease_id,p_sent)` returns boolean ownership acceptance. Both RPCs and the outbox table must be service-role-only. Payment notice keys are `subscription.created:<subscription-id>` and `order.paid:<order-id>` across both consumers. A crash after Slack accepts but before DB finish can still duplicate a notice because Slack incoming webhooks do not support transactional idempotency; the durable lease prevents normal concurrent/replay duplicates, not that external-system crash window.

Independent review convergence: `subscription.uncanceled` is processed and clears cancellation; canceled forces canonical canceled status, known product required for granting transitions. Product organization mismatch rejects. `trial_end_at` normalizes to projection `trial_end`. Final local suites: 91 assertions; helper TypeScript check and diff whitespace check pass.

Production compatibility: Cloudflare currently has no SLACK_WEBHOOK_URL, so missing optional Slack skips notifications without blocking entitlement processing or order acknowledgment. A nonsecret disabled-integration log makes that explicit. Configured Slack always uses the durable outbox and retries failures; no configured messages are silently lost.
