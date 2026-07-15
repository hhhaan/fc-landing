---
description:
alwaysApply: true
---

## Project
**First Crack · Ops Console (`@fc/admin`)** — Personal business operations dashboard. Package path: `fc-landing/apps/admin`. Dark command center with live Supabase data for the First Crack roasting platform.

## Stack
- **Next.js 16** (App Router)
- **Tailwind 4** — utility CSS
- **axios + TanStack React Query** — **all domain data fetching** (client)
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
| `pnpm --filter @fc/admin lint` | ESLint |

No test runner, no typecheck script (TS is checked by Next build). Run `pnpm build:admin` before claiming work is done.

---

# Architecture — FSD (4 layers only)

**Unidirectional:** `shared` → `widgets` → `pages` → `app`

```
app/        # Next routes / layouts / route handlers (thin)
pages/      # Page composition (React Query + widgets)
widgets/    # Composite UI blocks
shared/     # UI primitives, api (axios+RQ), lib — zero page knowledge
```

### Forbidden (do not add)
- `entities/`
- `features/`
- `processes/`
- classic FSD public-API barrels per slice (`index.ts` re-export forests)
- extra “services / hooks / containers” top-level layers
- **RSC `async` page data loading for domain data** (use React Query instead)
- **`useEffect` + fetch/axios** for domain data
- **direct Supabase client in browser** (service role must never ship to client)

**Why only 4:** enough boundary for long-term maintainability, not enough rope for over-abstraction. Page is the unit of product surface; widgets compose UI; shared is the only generic layer.

## Target structure
```
apps/admin/
├── app/                              # app layer (Next.js App Router ONLY)
│   ├── (dashboard)/
│   │   ├── layout.tsx                # shell wiring
│   │   ├── page.tsx                  # re-export → pages/overview
│   │   ├── billing/page.tsx
│   │   ├── map/page.tsx
│   │   ├── revenue/page.tsx
│   │   ├── system/page.tsx
│   │   └── users/page.tsx
│   ├── login/page.tsx
│   ├── api/                          # BFF — server-only Supabase
│   │   ├── auth/                     # login, logout
│   │   ├── kpis/route.ts
│   │   ├── users/route.ts
│   │   ├── revenue/route.ts
│   │   ├── billing/route.ts
│   │   ├── geo/route.ts
│   │   └── system/route.ts
│   ├── globals.css
│   ├── layout.tsx                    # QueryClientProvider wiring
│   └── error.tsx
├── pages/                            # pages layer (FSD — NOT Next Pages Router)
│   ├── overview/
│   │   └── ui/OverviewPage.tsx       # useQuery + compose widgets
│   ├── billing/
│   ├── map/
│   ├── revenue/
│   ├── system/
│   ├── users/
│   └── login/
├── widgets/                          # widgets layer
│   ├── shell/                        # DashboardShell, Sidebar, TopBar
│   ├── charts/
│   ├── map/
│   └── revenue/
├── shared/                           # shared layer
│   ├── ui/                           # Panel, KpiCard, Badge, StatusDot
│   ├── api/                          # axios calls + React Query (per domain)
│   │   ├── kpis/
│   │   │   ├── api.ts                # raw axios
│   │   │   └── queries.ts            # keys + useQuery / queryOptions
│   │   ├── users/
│   │   ├── revenue/
│   │   ├── billing/
│   │   ├── geo/
│   │   └── system/
│   ├── lib/
│   │   ├── axios.ts                  # axios singleton (credentials/cookies)
│   │   ├── query-client.ts           # QueryClient factory / defaults
│   │   ├── auth/session.ts           # server session sign/verify
│   │   ├── supabase/admin.ts         # service-role client (server-only)
│   │   ├── format.ts
│   │   └── pricing.ts
│   └── types/                        # database.types.ts
├── proxy.ts                          # session gate (Next middleware entry)
└── supabase/migrations/
```

### Next.js constraint (critical)
Next reserves **`pages/`** and **`src/pages/`** for the legacy **Pages Router**. This project is **App Router only**.

**Rule:** HTTP routes exist only under `app/**`. The FSD `pages` layer is composition modules imported by `app/**/page.tsx` — never registered as Next routes by themselves.

**If creating the FSD `pages/` directory causes Next to dual-route or fail the build**, relocate the FSD pages layer to a non-reserved path and alias it:

```jsonc
// tsconfig paths
"@/pages/*": ["./src/fsd-pages/*"]   // example safe physical path
```

Prefer the clean names (`pages/`, `widgets/`, `shared/`) when the tooling allows; **correctness of App Router > folder name purity**.

Do **not** introduce a Next Pages Router tree. Do **not** put `page.tsx` / `index.tsx` route entries inside the FSD pages layer.

---

## Layer rules

| Layer | Path | Responsibility | May import |
|-------|------|----------------|------------|
| **app** | `app/` | Routing shell, thin `page.tsx` re-exports, **BFF route handlers**, providers, global CSS | `pages`, `widgets`, `shared` |
| **pages** | `pages/<name>/` | One product page: React Query hooks from `shared/api`, compose widgets | `widgets`, `shared` |
| **widgets** | `widgets/<name>/` | Composite UI. No route ownership. **No axios / useQuery** (props in) | `shared` (ui, lib, types only) |
| **shared** | `shared/{ui,api,lib,types}/` | Primitives, axios+RQ API modules, pure utils, types | only other `shared` (sparingly) |

### Import rules
1. **Upper → lower only.** `shared` ↛ `widgets` / `pages` / `app`. `widgets` ↛ `pages` / `app`. `pages` ↛ `app`.
2. **No cross-import between sibling pages.** Compose via `shared` / `widgets` only.
3. **No cross-import between sibling widgets** unless extracted to `shared`. Prefer compose at the page.
4. **All domain data fetching = axios + React Query in `shared/api/*`.** Pages call hooks from `queries.ts`. Widgets receive data as props.
5. **`shared/ui` has zero domain knowledge.** Domain-colored UI → `widgets` or `pages`.
6. **No barrels:** no `utils.ts` / `helpers.ts` / slice-level `index.ts` re-export forests. Import the concrete file. (Thin `app/**/page.tsx` re-export is OK.)
7. **Pages that fetch are Client Components** (`"use client"`) — React Query runs on the client. Keep shell layouts free of domain queries when possible.

### app layer
```tsx
// app/(dashboard)/users/page.tsx — thin only
export { default } from "@/pages/users/ui/UsersPage";
```
- Root/layout: wire `QueryClientProvider` (from `shared/lib/query-client`).
- Layouts wire shell widgets (`widgets/shell`).
- **`app/api/**` = BFF**: session-checked handlers that call `shared/lib/supabase/admin` and return JSON. This is the only place domain reads hit Supabase with the service role.
- Auth handlers: `app/api/auth/*`.

### pages layer
- **One folder per route surface:** `overview`, `users`, `revenue`, `billing`, `map`, `system`, `login`.
- Page module: `"use client"` when it loads domain data; uses `useQuery` / `useMutation` from `shared/api/<domain>/queries`.
- Page-local helpers (tone mappers) may live next to the page if single-page and small (~40 lines).
- Loading / error UI for queries lives at the page (or a small local component) — not inside `shared/api`.

### widgets layer
- Composite UI: shell, charts, map, revenue blocks.
- **Props in, render out.** No `useQuery`, no `axios`, no `shared/api`.
- Extract to `widgets/` when reuse appears or the page file bloats; trivial single-page UI may stay under the page folder.

### shared layer
| Segment | Contents |
|---------|----------|
| `shared/ui` | Panel, KpiCard, Badge, StatusDot |
| `shared/api/<domain>/api.ts` | Raw axios calls to `/api/...` |
| `shared/api/<domain>/queries.ts` | `keyFactory` + `useQuery` / `queryOptions` / `useMutation` |
| `shared/lib` | `axios`, `query-client`, `format`, `pricing`, `auth/session`, `supabase/admin` |
| `shared/types` | Generated DB types, shared DTOs |

---

## Data architecture — axios + React Query (mandatory)

**All domain data fetching goes through axios + React Query.** No exceptions for “just this one RSC fetch.”

```
Page (useQuery)
  → shared/api/<domain>/queries.ts
    → shared/api/<domain>/api.ts  (axios)
      → app/api/<domain>          (Route Handler, cookie session)
        → shared/lib/supabase/admin  (service role, server-only)
```

### Rules
- **React Query + axios** for every domain read/write from the UI.
- **NO `useEffect` fetch.** NO raw `fetch()` in pages/widgets for domain data.
- **NO direct Supabase in client code.** Browser never sees `SUPABASE_SERVICE_ROLE_KEY`.
- **NO RSC async data loading** for ops domain data (no `await getOverviewData()` in Server Components).
- axios singleton: `shared/lib/axios.ts` — same-origin, `withCredentials` / cookie session.
- QueryClient defaults: `shared/lib/query-client.ts` (provider in `app/layout`).

### File split per domain (`shared/api/<domain>/`)
| File | Role |
|------|------|
| `api.ts` | Raw axios only — `getX()`, `postY()`. No hooks. |
| `queries.ts` | React Query: keys, `useQuery` / `queryOptions`, `useMutation` |

```ts
// queries.ts — keyFactory shape
export const kpisKeys = {
  all: ["kpis"] as const,
  overview: () => [...kpisKeys.all, "overview"] as const,
};
```

### React Query conventions
- **keyFactory:** `{ all, list(), detail(id), … }` — hierarchical keys, domain-prefixed.
- **mutation → `invalidateQueries`** on the affected key(s). **NO `refetch()`** as the primary sync path.
- Prefer `queryOptions` + `useQuery(options)` when it keeps keys/fn colocated cleanly.
- Reads in `queries.ts`; writes as `useMutation` in the same domain module (or `use<Action>.ts` next to it if the mutation grows).
- Treat list/detail params as part of the query key.

### Server BFF (`app/api/**`)
- One route (or small route group) per domain, aligned with `shared/api/<domain>`.
- Verify admin session cookie before querying.
- Call Supabase **only** via `shared/lib/supabase/admin.ts`.
- Return typed JSON; map errors to HTTP status codes.
- Keep handlers thin: auth gate → call server query helper → `Response.json`.

### State boundaries
| Kind | Where |
|------|--------|
| Server/domain data | React Query |
| Auth session | HTTP-only cookie (middleware / `proxy.ts`); no client auth store required |
| UI-only ephemeral | local React state in page/widget |
| **No** Zustand for server data | — |

Formatters: `shared/lib/format.ts` (`fmtNum`, `fmtUsd`, `fmtPct`, `fmtDate`, `fmtRel`, `clsx`).

## Auth
- Password gate: `ADMIN_PASSWORD`
- Cookie `fc_admin_session` — HMAC `ok.{exp}.{sig}` (14-day)
- `proxy.ts` session check → `/login` if invalid
- Login: `/login` → POST `/api/auth/login` · Logout: POST `/api/auth/logout`
- axios calls rely on cookie session to `/api/*`; BFF re-checks as needed

## Design
- Dark ops console: `#07090b` bg, `#e8eaed` fg, `#81fba5` accent
- CSS vars only: `--bg`, `--fg`, `--panel`, `--border`, `--accent`, `--muted`, `--faint`, `--warn`, `--bad`, `--good`
- Geist Sans / Geist Mono · Lucide only · **no emoji**
- Dense data UI · panels: no rounded corners (buttons may `rounded-full`)
- Conditional classes via `clsx`

## SRP — all files (.ts / .tsx)
- Reasons-to-change → **1 = OK**, **>1 = split**
- `>300` lines = re-check trigger, not the rule
- Split when: axios + RQ + render in one file · widget knows two domains · file named `utils`/`helpers`
- Per domain: `api.ts` (transport) vs `queries.ts` (cache/hooks) vs page (compose)

## Architecture priority
Maintainability and clear boundaries beat fewer files or shorter diffs.
When “shortest change” conflicts with layer rules or SRP — **architecture wins**.

### When to extract (and when NOT to)
Extract only if **all** hold: 3+ real call sites · same reason-to-change · no bad-abstraction signals.

**Bad abstraction — don’t extract / revert:**
- type-branching grows with callers
- one caller’s change leaks to others
- boolean `isX` / `mode` flags fork behavior
- generic names (`handleData`, `process`, `util`)
- can’t explain “why same” in one sentence
- speculative “might need later”

**Prefer duplication over a wrong shared widget.** Two similar KPI rows on one page are fine.

## Security — env vars
| Var | Client? |
|-----|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | only if a public client is ever needed — **default: unused on client** |
| `SUPABASE_SERVICE_ROLE_KEY` | **never** — Route Handlers / server only |
| `ADMIN_PASSWORD` | **never** |
| `ADMIN_SESSION_SECRET` | **never** |

Browser talks to **`/api/*` only**. Service role stays on the server.

---

# AGENT RULES
- Brief and direct. Fewest words that finish the task.
- Implementing code: no chat fluff — precise edits. Reviews/plans/questions: normal prose.
- No emoji in product UI — Lucide.
- ALWAYS prefix shell with `rtk ` (`rtk ls`, `rtk git`, `rtk npm`). Exception only if compression breaks debugging.
- Commit flow: `git add` → `rtk gen-cmt` when using project commit flow.
- **Not** the Tauri desktop app — no sidecar, no desktop FSD (`entities` / `features` / `views`).
- **Stay within 4 layers:** `app` · `pages` · `widgets` · `shared`. Do not invent `entities`/`features`/extra tops.
- **Data fetching: axios + React Query only.** No RSC domain fetch, no `useEffect` fetch, no client Supabase.
- New page checklist:
  1. `app/api/<name>/route.ts` — session gate + Supabase (server)
  2. `shared/api/<name>/api.ts` — axios
  3. `shared/api/<name>/queries.ts` — keyFactory + useQuery/useMutation
  4. `pages/<name>/ui/<Name>Page.tsx` — `"use client"`, hooks + compose widgets
  5. `app/(dashboard)/<name>/page.tsx` — thin re-export
  6. `widgets/<name>/` only if composite UI is non-trivial or reused
  7. Nav entry in `widgets/shell` when it is a top-level ops surface

## Physical paths (Next-safe)
FSD **pages** layer lives at `fsd-pages/` (not root `pages/`) to avoid Next Pages Router.

```jsonc
// tsconfig paths
"@/pages/*": ["./fsd-pages/*"]
```

| FSD layer | Path |
|-----------|------|
| app | `app/` |
| pages | `fsd-pages/` (`@/pages/*`) |
| widgets | `widgets/` |
| shared | `shared/` |

Domain modules: `shared/api/<domain>/{types,server,api,queries}.ts` + BFF `app/api/<domain>/route.ts`.
)
