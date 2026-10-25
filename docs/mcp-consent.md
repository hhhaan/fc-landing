# MCP login, consent and revocation

Source implementation only; all gates default off. No credentials, native OAuth clients,
hosted settings, plugin releases, pushes or deployments were changed.

The external app receives an independent **opaque MCP access/refresh token**, never the
Supabase browser/desktop session. `decideNativeConsent` still unconditionally refuses
native OAuth approval. The companion issuer source is in `hhhaan/firstcrack` under
`supabase/functions/{firstcrack-oauth,_shared/mcp-oauth}`. Custom `firstcrack:read` is a scope
of that issuer, not a supported custom native Supabase OAuth scope.

## Routes

- `/.well-known/oauth-authorization-server/oauth/mcp`: RFC 8414 discovery.
- `/oauth/mcp/{authorize,token,revoke}`: public server proxy to the fixed Supabase project's
  issuer function. Cookies and native Authorization are never forwarded. Token responses
  must contain only the expected opaque credential format and lifetime; native JWT replies
  fail closed. Exact static HTTPS callbacks, resource binding and S256 PKCE are required.
- `/oauth/consent?authorization_id=...`: existing SSR identity, existing `/login?next=...`
  and `/auth/callback`, explicit verified roastery selection. Server validates client,
  callback, issuer, resource, scope, credential kind and current identity on every request.
  GET never approves; POST requires same Origin and a short-lived HttpOnly CSRF cookie.
- `/account/connections`: native SSR user lists up to 100 recent own grants and revokes
  through a same-origin CSRF-protected POST. Backend independently filters by verified
  user, so submitting another user's grant ID cannot revoke it.

Native bearer proof goes only to the project's fixed internal `details`, `decision`,
`grants`, `revoke-grant` endpoints with redirects prohibited. These independently verify
native identity. Neither a submitted user ID nor editable metadata is trusted. User and
selected workspace are bound persistently; refresh cannot expand scope/roastery. Removal
of membership, expiry and revocation block subsequent reads. Existing native login,
Google/password callback and desktop deep-link behavior are preserved.

User-facing pages follow the existing ox design with English copy, no token scripts or
sample fallback. Seven DTO tools cover own profile, selected workspace, bean definitions,
products, orders, saved plans and roast summaries. No balances/raw roast curves/equipment
or write operations are included; see the companion `docs/agent/firstcrack-mcp.md` for limits.

## Optional server-only bindings

| Binding | Value after approved activation |
| --- | --- |
| `MCP_OAUTH_ENABLED`, `MCP_OAUTH_READONLY_READY` | Exactly `true`, only after issuer/DB checks |
| `MCP_OAUTH_ISSUER_URL` | Proposed `https://firstcrackiscoming.com/oauth/mcp` |
| `MCP_OAUTH_RESOURCE_URL` | Proposed `https://vjdgdolfxvnxushxrmff.supabase.co/functions/v1/firstcrack-mcp` |
| `MCP_OAUTH_CLIENT_IDS` | Registered host client IDs, comma separated |
| `MCP_OAUTH_REDIRECT_URIS` | Exact host callbacks verified in host management, comma separated |

The native project URL is the existing `PUBLIC_SUPABASE_URL`. Landing requires no new
secret/client credential/signing key; the issuer's two limited DB credentials live only
in Supabase Edge server secrets. Missing prerequisites return unavailable, never demo data.
No native Supabase OAuth provider, token hook, RLS or Auth settings are enabled by these
source changes. Source URLs are proposed routing, not evidence of deployed endpoints.

## Local checks

```sh
pnpm --filter @fc/landing test:mcp
PUBLIC_SUPABASE_URL=https://native.example PUBLIC_SUPABASE_ANON_KEY=fixture-public-key pnpm build:landing
# In the companion firstcrack checkout, with this checkout patched too:
MCP_TEST_LANDING_ROOT=/path/to/fc-landing bash supabase/tests/test-mcp-opaque.sh
```

Controller tests cover login return, verified consent and selected membership, CSRF,
identity/client/scope/callback substitution, expired login, native approval refusal,
public-proxy token-leak protection and grant management. The companion PostgreSQL 17
integration uses these actual controllers, native Supabase SDK identity verification and
MCP SDK discovery/PKCE/read/automatic refresh against disposable Auth/JWKS and DB fixtures.
No hosted account or host callback was used. Build has existing Cloudflare adapter warnings.

Verified locally: **16 controller tests**, pure controller TypeScript checks and landing
production build passed. Actual Astro HTTP requests returned consent/connections →
existing login 303, login HTML 200 and foreign-Origin revocation 403, with unused local
fixture bindings only. Companion integration passed **119 assertions**, including official
MCP SDK automatic refresh; all **297 Edge tests** and **19 Edge entrypoint** checks passed.

## Pending approval and verification

Target remains existing Cloudflare Pages **fc-landing**, **firstcrackiscoming.com**, plus
Supabase **vjdgdolfxvnxushxrmff**. Companion SQL is a proposal, not a migration: full local
Supabase replay was blocked by policy-denied ECR image pulls. That check, hosted policy
review, exact client/callback registration and actual browser/desktop coexistence remain.

After those gates, approval must cover limited DB roles/private grant tables and server
DSNs, deploying issuer/MCP with function-specific gateway JWT verification disabled
(authentication is in the handlers), landing deployment/bindings, and the existing private
plugin update. No new hosting or plugin is needed. No operational action was executed.

Rollback starts with disabling all three feature gates, disabling the client and revoking
its MCP grants, then returning the plugin to sample-only and rolling back releases.
Retain native-token refusal and existing customer RLS; remove dedicated runtime credentials
only after requests stop. The old native-token hook must never be used as an activation shortcut.
