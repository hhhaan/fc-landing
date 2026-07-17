# CI/CD — fc-landing monorepo

## Local hooks (Husky + Biome)

| Command | Purpose |
|---------|---------|
| `pnpm check` | Biome lint/format check on `apps` + `scripts` |
| `pnpm check:fix` | Auto-fix with Biome |
| `pnpm check:docs-i18n` | Docs locales (ko root / en / ja) page parity |
| pre-commit | `lint-staged` → Biome; if docs content staged → `check:docs-i18n` |

Install once after clone:

```bash
pnpm install   # runs `prepare` → husky
```

## GitHub Actions

| Workflow | Trigger | Action |
|----------|---------|--------|
| **CI** | PR + push `main` | Biome on **changed** files; path-filtered builds |
| **Deploy Landing** | push `main` (`apps/landing/**`) | Cloudflare Pages `fc-landing` |
| **Deploy Cupping** | push `main` (`apps/cupping/**`) | Cloudflare Pages `fc-cupping` |
| **Deploy Docs** | push `main` (`apps/docs/**`) | Cloudflare Pages `fc-docs` |
| **Deploy Admin** | push `main` (`apps/admin/**`) | Vercel `fc-admin` |

All deploy workflows support **workflow_dispatch** (manual run).

## Required secrets / vars

Repo → **Settings → Secrets and variables → Actions**

### Secrets

| Name | Used by | Notes |
|------|---------|--------|
| `CLOUDFLARE_API_TOKEN` | landing, cupping, docs | Pages **Edit** permission |
| `PUBLIC_SUPABASE_ANON_KEY` | CI builds, landing/cupping | Public anon key (ok as secret) |
| `VITE_SUPABASE_ANON_KEY` | cupping (optional) | Fallback if `PUBLIC_SUPABASE_ANON_KEY` unset |
| `VERCEL_TOKEN` | admin | [Vercel token](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | admin | Team/user id (`team_…`) |
| `VERCEL_PROJECT_ID` | admin | `prj_…` for `fc-admin` |

### Variables (optional)

| Name | Default |
|------|---------|
| `CLOUDFLARE_ACCOUNT_ID` | `da47c859f47b9284b03ecca3c349ab87` |
| `PUBLIC_SUPABASE_URL` | `https://vjdgdolfxvnxushxrmff.supabase.co` |
| `PUBLIC_SITE_URL` | `https://firstcrackiscoming.com` |

Admin **runtime** secrets (`SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`, …) stay in **Vercel project env**, not GitHub.

## Production URLs

| App | URL |
|-----|-----|
| Landing | https://fc-landing.pages.dev · https://firstcrackiscoming.com |
| Cupping | https://fc-cupping.pages.dev |
| Docs | https://fc-docs-386.pages.dev (custom: `docs.firstcrackiscoming.com` if linked) |
| Admin | https://fc-admin-sigma.vercel.app |

## Notes

- CI Biome uses `--changed` so legacy format debt does not block PRs; hooks clean new commits gradually.
- Landing deploy no longer runs on PRs (CI builds only); deploy is push/`workflow_dispatch` only.
- Cupping invite base URL (`VITE_CUPPING_PUBLIC_BASE_URL` / desktop env) is independent of CI deploy target.
