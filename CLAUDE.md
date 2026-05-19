# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands run from the **monorepo root** via pnpm workspaces:

```bash
pnpm dev:landing        # landing app dev server (localhost:4321)
pnpm dev:docs           # docs app dev server
pnpm build:landing      # production build for landing
pnpm build:docs         # production build for docs
```

From within `apps/landing` directly:
```bash
astro dev
astro build
astro preview
```

No test runner is configured yet.

## Architecture: Islands Strategy

All pages are static-first Astro (`.astro`). There are **no React components** in the current codebase — light interactivity is handled via inline `<script>` blocks inside `.astro` files (e.g., the pricing toggle in `index.astro`).

Follow these rules when adding new code:

- **No interactivity needed → `.astro` component** in `src/components/ui/`
- **Needs `useState`/`useEffect` → React `.jsx` component** in `src/components/react/`, hydrated with `client:visible` by default
- **API calls → server-side in the `.astro` code fence (`---`)**, passed as props to components
- Do not use client-side global state libraries

## Monorepo Structure

```
apps/
├── landing/   # Main marketing + auth site (@fc/landing)
│   ├── src/
│   │   ├── actions/index.ts       # Astro Actions: signUp, signIn, signOut
│   │   ├── lib/supabase.ts        # SSR Supabase client factory
│   │   ├── lib/auth.ts            # requireLogin() guard helper
│   │   ├── pages/                 # File-based routing
│   │   └── styles/global.css      # Design tokens (CSS custom properties)
│   └── astro.config.mjs           # output: 'server', Cloudflare adapter, Tailwind v4
└── docs/      # Starlight documentation site (@fc/docs, mostly scaffold)
```

## Auth Flow (Supabase SSR)

`src/lib/supabase.ts` exports `createClient({ request, cookies })` which wraps `@supabase/ssr`'s `createServerClient`. **Always pass both `request` and `cookies` from the Astro context** — the client reads cookies from the request header and writes session cookies back via `AstroCookies`.

Two auth paths exist:
1. **Email/password** — handled via Astro Actions (`src/actions/index.ts`). Form submits POST, action runs server-side.
2. **Google OAuth** — handled client-side via `createBrowserClient` in inline `<script>` blocks (signup/login pages). The OAuth callback lands at `/auth/callback`, where the server exchanges the code for a session cookie.

The `?next=` query param threads through both flows so users land on the right page after auth.

`requireLogin(Astro)` in `src/lib/auth.ts` redirects unauthenticated users to `/login?next=<current-url>`.

## Payment Flow (Polar)

`/start-pro.astro` is a server-only redirect page. It:
1. Guards with `requireLogin` — unauthenticated users go to login first
2. Reads `?plan=monthly|yearly` from the URL
3. Builds a Polar checkout URL using hardcoded sandbox checkout links, appending `customerEmail`, `metadata[user_id]`, and `customerIpAddress` as query params
4. Returns `Astro.redirect(finalUrl)`

Switch between sandbox and production by toggling the `POLAR_SERVER` env var and updating the `polarLinks` object in `start-pro.astro`.

## Design System

Design tokens live in `src/styles/global.css` as CSS custom properties. The visual language is based on ElevenLabs' aesthetic (see `apps/landing/DESIGN.md` for the full spec):

- **Font**: Pretendard Variable (served from `public/fonts/`) for display + body; Geist Mono for code
- **Color**: near-achromatic with warm undertones — `#f5f5f5` secondary surface, `#777169` muted/warm gray
- **Shadows**: multi-layer stacks at sub-0.1 opacity; inset half-pixel borders (`0px 0px 0px 0.5px inset`)
- **Radius**: pill (9999px) for buttons, 16–24px for cards
- **Spacing**: 8px base scale via `--space-*` tokens

Use CSS custom properties (e.g., `var(--color-fg-secondary)`, `var(--space-24)`) rather than Tailwind utility classes for design-system values. Tailwind v4 is available for layout utilities.

## Cloudflare Deployment

`apps/landing` targets Cloudflare Pages with the `@astrojs/cloudflare` adapter. Environment variables must be set in the Cloudflare Dashboard under Pages → Settings → Variables and match the names in `.env`:

- `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`
- `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET`
- `LOGSNAG_TOKEN`, `LOGSNAG_PROJECT`

Access all env vars via `import.meta.env.VAR_NAME`. The `cf-connecting-ip` header is available server-side on Cloudflare Workers/Pages.
