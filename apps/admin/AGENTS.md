---
description:
alwaysApply: true
---

## Project
**First Crack · Ops Console (`@fc/admin`)** — Personal business operations dashboard. Package path: `fc-landing/apps/admin`. Dark command center with live Supabase data for the First Crack roasting platform.

## Stack
- **Next.js 16** (App Router)
- **Tailwind 4** — utility CSS
- **fetch + TanStack React Query** — domain data on the client
- **Supabase** — service role on **server only** (Route Handlers / BFF)
- **MapLibre GL** — geo map (auth session IPs)
- **Recharts** — sparklines / bar charts
- **Lucide** — icons
- **Geist** — font (sans + mono from `next/font/google`)
- **Password gate** — HMAC-signed cookie session (no auth provider)

> This is NOT the Next.js from training data. APIs/conventions may differ — read `node_modules/next/dist/docs/` before writing Next-specific code. Heed deprecation notices.

## Commands

| Command | What |
|---------|------|
| `pnpm dev:admin` (repo root) | `next dev` — localhost:3000 |
| `pnpm build:admin` | `next build` |
| `pnpm --filter @fc/admin start` | production serve |
| `pnpm --filter @fc/admin lint` | Biome (repo root) |

No test runner, no typecheck script (TS is checked by Next build). Run `pnpm build:admin` before claiming work is done.

---

# Architecture (3 layers)

**Unidirectional:** `shared` → `widgets` → `app`

```
app/        # Next routes, page UI, layouts, route handlers
widgets/    # Composite UI blocks (props in)
shared/     # ui, api (fetch + RQ), lib — zero page knowledge
```

### Forbidden (do not add)
- `entities/`, `features/`, `processes/`, separate FSD `pages/` or `fsd-pages/`
- classic FSD public-API barrels per slice (`index.ts` re-export forests)
- **RSC `async` page data loading for domain data** (use React Query instead)
- **`useEffect` + fetch** for domain data
- **direct Supabase client in browser** (service role must never ship to client)
- **axios** — use `shared/lib/http.ts`

## Target structure
```
apps/admin/
├── app/
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx                  # overview UI ("use client")
│   │   ├── users/page.tsx
│   │   ├── revenue/page.tsx
│   │   └── …
│   ├── login/page.tsx
│   ├── api/                          # BFF — server-only Supabase
│   │   ├── auth/
│   │   ├── kpis/route.ts
│   │   └── …
│   ├── globals.css
│   ├── layout.tsx                    # QueryProvider
│   └── error.tsx
├── widgets/                          # shell, charts, map, …
├── shared/
│   ├── ui/                           # Panel, KpiCard, …
│   ├── api/<domain>/
│   │   ├── types.ts
│   │   ├── server.ts                 # service-role queries (server-only)
│   │   └── queries.ts                # fetch + useQuery / useMutation
│   ├── lib/
│   │   ├── http.ts                   # apiGet/Post/Patch/Delete
│   │   ├── QueryProvider.tsx
│   │   ├── auth/session.ts
│   │   ├── supabase/admin.ts
│   │   ├── format.ts
│   │   └── pricing.ts
│   └── types/
├── proxy.ts
└── supabase/migrations/
```

## Layer rules

| Layer | Path | Responsibility | May import |
|-------|------|----------------|------------|
| **app** | `app/` | Routes, page UI, BFF handlers, providers | `widgets`, `shared` |
| **widgets** | `widgets/` | Composite UI. **No useQuery / http** (props in) | `shared` (ui, lib, types) |
| **shared** | `shared/{ui,api,lib,types}/` | Primitives, fetch+RQ modules, utils | only other `shared` |

### Import rules
1. **Upper → lower only.**
2. **No cross-import between sibling widgets** unless extracted to `shared`.
3. **Domain data = React Query hooks in `shared/api/*/queries.ts`.** Pages call those hooks.
4. **`shared/ui` has zero domain knowledge.**
5. **No barrels.** Import the concrete file.
6. **Pages that fetch are Client Components** (`"use client"`).

### app layer
- Page UI lives in `app/**/page.tsx` (not a separate FSD pages folder).
- Root layout: `QueryProvider` from `shared/lib/QueryProvider`.
- **`app/api/**` = BFF**: session-checked handlers → `shared/api/*/server` or lib → JSON.

### shared/api per domain
| File | Role |
|------|------|
| `types.ts` | DTOs |
| `server.ts` | Supabase service-role reads/writes (`import "server-only"`) |
| `queries.ts` | `apiGet`/`apiPost` + keys + `useQuery` / `useMutation` |

```
Page (useQuery)
  → shared/api/<domain>/queries.ts  (fetch via shared/lib/http)
    → app/api/<domain>              (Route Handler)
      → shared/api/<domain>/server  or lib (service role)
```

### React Query conventions
- **keyFactory:** `{ all, list(), detail(id), … }`
- **mutation → `invalidateQueries`**
- **NO `useEffect` fetch** for domain data; hooks only.
- **NO client Supabase.**

### Server BFF (`app/api/**`)
- Verify admin session before querying.
- Supabase only via `shared/lib/supabase/admin.ts`.
- Thin handlers: auth → server helper → JSON.

Formatters: `shared/lib/format.ts` (`fmtNum`, `fmtUsd`, `fmtPct`, `fmtDate`, `fmtRel`, `clsx`).

## Auth
- Password gate: `ADMIN_PASSWORD`
- Cookie `fc_admin_session` — HMAC `ok.{exp}.{sig}` (14-day)
- `proxy.ts` session check → `/login` if invalid
- Login: `/login` → POST `/api/auth/login` · Logout: POST `/api/auth/logout`
- `fetch` to `/api/*` uses same-origin cookies

## Design
- Dark ops console: `#07090b` bg, `#e8eaed` fg, `#81fba5` accent
- CSS vars only: `--bg`, `--fg`, `--panel`, `--border`, `--accent`, `--muted`, `--faint`, `--warn`, `--bad`, `--good`
- Geist Sans / Geist Mono · Lucide only · **no emoji**
- Dense data UI · panels: no rounded corners (buttons may `rounded-full`)
- Conditional classes via local `clsx` in `format.ts`

## SRP
- Reasons-to-change → **1 = OK**, **>1 = split**
- `>300` lines = re-check trigger
- Prefer duplication over a wrong shared widget

## Security — env vars
| Var | Client? |
|-----|---------|
| `SUPABASE_SERVICE_ROLE_KEY` | **never** |
| `ADMIN_PASSWORD` | **never** |
| `ADMIN_SESSION_SECRET` | **never** |

Browser talks to **`/api/*` only**. Service role stays on the server.

---

# AGENT RULES
- Brief and direct. Fewest words that finish the task.
- No emoji in product UI — Lucide.
- ALWAYS prefix shell with `rtk ` when using project RTK flow.
- **Not** the Tauri desktop app.
- **Stay within 3 layers:** `app` · `widgets` · `shared`.
- **Data fetching: React Query + `shared/lib/http` only.** No RSC domain fetch, no `useEffect` fetch, no client Supabase.
- New page checklist:
  1. `app/api/<name>/route.ts` — session gate + server helper
  2. `shared/api/<name>/{types,server,queries}.ts`
  3. `app/(dashboard)/<name>/page.tsx` — `"use client"`, hooks + UI
  4. `widgets/<name>/` only if composite UI is reused
  5. Nav entry in `widgets/shell` when top-level
