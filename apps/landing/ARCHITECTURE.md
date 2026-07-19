# Landing app architecture (`@fc/landing`)

Marketing site, auth, and checkout handoff for First Crack. Deployed to **Cloudflare Pages** via `@astrojs/cloudflare` (`output: 'server'`).

For design tokens and UI patterns, see [`DESIGN_RULES.md`](DESIGN_RULES.md). For monorepo commands, auth, payments, and geo routing, see [`../../CLAUDE.md`](../../CLAUDE.md).

---

## Stack

| Layer | Choice |
|-------|--------|
| Framework | Astro 6 (`.astro` pages, server output) |
| Adapter | `@astrojs/cloudflare` |
| Styling | Scoped `ox` CSS per page (`<style is:global>`) + legacy `global.css` on unmigrated routes |
| Layout utilities | Tailwind v4 (available; most `ox` pages use plain CSS) |
| Auth | Supabase SSR (`@supabase/ssr` pattern in `src/lib/supabase.ts`) |
| Payments | Polar checkout redirect (`start-pro.astro`) + webhook (`pages/api/webhooks/polar.ts`) |
| Interactivity | Inline `<script>` in `.astro` files — **no React** in the current codebase |

---

## Directory map

```
apps/landing/
├── ARCHITECTURE.md          ← this file
├── DESIGN_RULES.md          ← ox design system (source of truth)
├── astro.config.mjs
└── src/
    ├── actions/index.ts     # Astro Actions: signUp, signIn, signOut
    ├── components/ui/
    │   ├── Favicon.astro
    │   ├── OxLegalShell.astro   # privacy, terms layout + prose styles
    │   └── OxJobShell.astro     # careers/* JD layout + apply sidebar
    ├── lib/
    │   ├── auth.ts          # requireLogin()
    │   ├── supabase.ts      # SSR + browser client factories
    │   └── market.ts        # geo market resolution (home)
    ├── content/markets.ts   # per-market pricing
    ├── content/product.ts   # Free/Trial/plan copy, machines, FAQ
    ├── pages/               # file-based routes (see table below)
    └── styles/global.css    # legacy design tokens — do not extend for new UI
```

---

## Page inventory

### `ox` design system (current)

| Route | File | Template | Notes |
|-------|------|----------|-------|
| `/` | `index.astro` | Marketing | Fixed header, full-viewport panes, scroll spy, pricing toggle |
| `/login` | `login.astro` | Auth | Email/password + Google OAuth |
| `/signup` | `signup.astro` | Auth | Trial signup + terms checkbox |
| `/download` | `download.astro` | Utility | Platform cards, OS detect script |
| `/about` | `about.astro` | Company | Story, values, hardware list; dark product CTA |
| `/faq` | `faq.astro` | Support | Free vs trial, machines, plans (`src/content/product.ts`) |
| `/careers` | `careers.astro` | Careers | Job table + client-side filters |
| `/careers/*` | `careers/*.astro` | Job detail | Content slots → `OxJobShell` |
| `/privacy` | `privacy.astro` | Legal | Prose slot → `OxLegalShell` |
| `/terms` | `terms.astro` | Legal | Prose slot → `OxLegalShell` |

### Server / API (no marketing UI)

| Route | File | Role |
|-------|------|------|
| `/auth/callback` | `auth/callback.astro` | OAuth code exchange |
| `/auth/signout` | `auth/signout.astro` | Session teardown |
| `/start-pro` | `start-pro.astro` | Polar checkout redirect (guarded) |
| `/api/webhooks/polar` | `api/webhooks/polar.ts` | Subscription webhook |
| `/{kr,us,jp,global}` | `{kr,us,jp,global}.astro` | Market cookie + redirect to `/` |

### Legacy (`global.css` — migrate when touched)

| Route | File |
|-------|------|
| `/account` | `account.astro` |

---

## UI composition patterns

### 1. Self-contained pages

Most routes are full HTML documents: frontmatter → markup → optional `<script>` → `<style is:global>`. Each `ox` page duplicates the token block and shared component CSS from a reference page until extraction (see `DESIGN_RULES.md` §16).

### 2. Layout shells (shared chrome)

Use when multiple routes share identical header, footer, and prose styles:

- **`OxLegalShell`** — pass `title`, `description`, `heading`, `updated`; slot legal body HTML.
- **`OxJobShell`** — pass role metadata + `applySubject`; slot JD sections; mailto apply in sticky sidebar.

New shells belong in `src/components/ui/` when **three or more** pages would otherwise duplicate the same chrome.

### 3. Client scripts

Keep scripts page-local. Common patterns:

- `IntersectionObserver` + `.reveal` (marketing, about)
- Header scroll state + section spy (`index.astro`)
- Form submit via `fetch` to Astro Actions (`login`, `signup`)
- `createBrowserClient` for Google OAuth (`login`, `signup`)
- Filter/search on static DOM (`careers.astro`)

### 4. Server data in frontmatter

```astro
---
const supabase = createClient({ request: Astro.request, cookies: Astro.cookies });
const { data: { user } } = await supabase.auth.getUser();
---
```

Always pass **both** `request` and `cookies` to the SSR client.

---

## CSS strategy

| System | Scope | Status |
|--------|-------|--------|
| **`ox`** | `body.ox` + `--ox-*` tokens | Active — all public marketing/auth/utility pages |
| **Legacy** | `global.css` (mint buttons, pill radii, Pretendard) | Frozen — `account.astro` only |

Rules:

- New pages: `body.ox`, copy tokens from `DESIGN_RULES.md` or a reference page.
- Do not add `ox` tokens into `global.css` without namespacing.
- Prefer reusing class names (`.ox-btn`, `.ox-shell`, `.ox-auth-header`) before inventing page-specific ones.

---

## Adding a new page

1. Pick the closest template in `DESIGN_RULES.md` §9.
2. If legal or JD content, use `OxLegalShell` / `OxJobShell`.
3. Copy fonts link + token CSS from the reference implementation (§15).
4. Run `pnpm build:landing` from the monorepo root.
5. Update the page inventory table in this file if the route is user-facing.

---

## Deployment

- **Build:** `pnpm build:landing` → `apps/landing/dist/`
- **Env vars:** set in Cloudflare Pages dashboard; access via `import.meta.env.*`
- **Sessions:** Cloudflare KV binding `SESSION` (see wrangler / adapter warnings on build)
- **Geo:** `CF-IPCountry` header drives market resolution on `/` — see `docs/geo-market-routing.md`