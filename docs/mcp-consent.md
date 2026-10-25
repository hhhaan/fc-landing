# MCP connection consent — disabled source implementation

The `/oauth/consent?authorization_id=...` route reuses the existing landing SSR Supabase
client and browser cookies. Logged-out users return through the existing `/login?next=...`
and `/auth/callback` path. Native desktop login and its session are separate.

This is an initial **personal-workspace-only** flow. It does not select or grant access
to team workspaces. The companion `hhhaan/firstcrack` token-hook proposal derives the owner
from the verified token subject and issues a dedicated `firstcrack_reader` role with a
signed `firstcrack_access: read` permission. The proposed DB/Edge boundary is only an experimental prototype: a DB reader role does not restrict the managed Auth account-update API. An isolated MCP issuer must be designed before approval can be enabled. No hosted configuration has been changed. The approve button is disabled even when review flags are enabled.

Supabase's official OAuth flow documentation says **custom scopes are not currently supported**.
The UI therefore accepts only standard `openid`; that scope does not enforce database read access.
Do not substitute a normal `authenticated` user JWT for the dedicated reader credential.

Server-only optional bindings in `apps/landing/astro.config.mjs`:

| Binding | Requirement |
| --- | --- |
| `MCP_OAUTH_ENABLED` | Exactly `true` only after approved activation |
| `MCP_OAUTH_READONLY_READY` | Exactly `true` only after issuer, DB, RPC and existing Edge write paths pass checks |
| `MCP_OAUTH_CLIENT_IDS` | Verified, registered host client IDs; comma separated |
| `MCP_OAUTH_REDIRECT_URIS` | Exact verified host callback URIs; comma separated; no invented default |

With any prerequisite missing the route returns 503 without invoking Auth. Otherwise it verifies
the current user and authorization request, client, scope and registered callback. GET renders
the client/account and explicit allow/deny controls. POST requires the same Origin and a
short-lived HttpOnly CSRF cookie bound to the authorization ID, then rechecks identity/details
before calling the consent adapter. The native adapter refuses every approval server-side and only supports denial. The returned callback is validated again.
Third-party names are rendered as text; no credentials or tokens are put into page scripts.

Supabase can return a redirect for an already auto-approved grant without its client/user details.
That case currently fails closed (409); revocation and a fresh consent flow are required. Hosted
refresh/revocation and provider audience/role compatibility remain unverified.

Validation performed locally on 2026-10-25:

```sh
pnpm --filter @fc/landing test:mcp
PUBLIC_SUPABASE_URL=https://auth-fixture.invalid PUBLIC_SUPABASE_ANON_KEY=fixture-public-key pnpm build:landing
```

Eleven controller tests cover login return, verified review, approval/denial, CSRF, user/client/scope
substitution, callback substitution, expired sessions, provider errors and safe web redirects.
Actual local Astro HTTP checks with fixture-only configuration passed: logged-out consent → 303
to the existing login page, login HTML → 200, cross-origin approval → 403. No real account, OAuth
client or hosted grant was created. The build reports existing Cloudflare adapter warnings.

Activation target is existing Cloudflare Pages **fc-landing**, serving **firstcrackiscoming.com**.
It requires approval to deploy/configure, together with the companion Supabase project's Auth,
reader DB boundary and MCP endpoint. Existing plugin identity/audience must be preserved.
Disable consent/MCP flags and stop/revoke the integration client/grants before restoring Auth hooks;
removing a restrictive token hook while refresh remains enabled could mint unrestricted tokens.

Reference: https://supabase.com/docs/guides/auth/oauth-server/oauth-flows

Activation blocker: native Supabase tokens may authorize managed Auth account mutations outside PostgREST RLS. Use existing login for identity only and a separately scoped MCP credential that Supabase Auth rejects. Selecting/provisioning that issuer and persistent grant storage requires approval; it has not been built or configured. The companion token-hook SQL must not be treated as production isolation.
