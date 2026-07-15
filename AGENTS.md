# Agent guide — fc-landing

Instructions for AI agents working in this monorepo. For full project context (auth, payments, geo routing, deployment), see [`CLAUDE.md`](CLAUDE.md).

## Commands

Run from the **monorepo root**:

```bash
pnpm dev:landing        # localhost:4321
pnpm dev:docs
pnpm dev:cupping        # localhost:5174 — QR cupping form `/c/:token`
pnpm dev:admin          # localhost:3000 — ops console (Next.js)
pnpm build:landing
pnpm build:docs
pnpm build:cupping
pnpm build:admin
```

No test runner is configured yet.

## Architecture (short)

- **Monorepo:** `apps/landing` (marketing + auth), `apps/docs` (Starlight), `apps/cupping` (QR form), `apps/admin` (ops console, Next.js)
- **Landing detail:** [`apps/landing/ARCHITECTURE.md`](apps/landing/ARCHITECTURE.md) — routes, shells, CSS strategy, migration status
- **Stack:** Astro 6, server output, Cloudflare adapter, Tailwind v4 available
- **Interactivity:** inline `<script>` in `.astro` files by default — no React in the current landing codebase
- **New UI without state →** `src/components/ui/*.astro` (e.g. `OxLegalShell`, `OxJobShell`)
- **New UI with state →** `src/components/react/*.jsx` + `client:visible`
- **Legacy UI:** `account.astro` still uses `global.css` — migrate to `ox` when touched

## Design system

**All landing UI work must follow the `ox` design system.**

| Doc | Purpose |
|-----|---------|
| **[`apps/landing/DESIGN_RULES.md`](apps/landing/DESIGN_RULES.md)** | **Source of truth** — tokens, typography, components, page templates, motion, a11y |
| [`apps/landing/DESIGN.md`](apps/landing/DESIGN.md) | Legacy ElevenLabs-inspired spec (outdated; do not use for new pages) |

### Before building or restyling a page

1. Read **`DESIGN_RULES.md`**
2. Copy patterns from a reference page:
   - Marketing: `apps/landing/src/pages/index.astro`
   - Auth: `login.astro`, `signup.astro`
   - Utility: `download.astro`
3. Use `body.ox`, `--ox-*` tokens, Instrument Sans + JetBrains Mono — not legacy `global.css` mint buttons or pill radii

### Quick reminders

- Sharp corners (`border-radius: 0`) on buttons, inputs, cards
- Warm stone palette: `#fafaf9` bg, `#080503` fg
- English copy for marketing/product UI
- Verify with `pnpm build:landing`

## Key paths

```
apps/landing/
├── ARCHITECTURE.md          ← routes, patterns, migration status
├── DESIGN_RULES.md          ← design (read this)
├── src/pages/               ← routes (mostly self-contained ox pages)
├── src/components/ui/       ← Favicon, OxLegalShell, OxJobShell
├── src/lib/supabase.ts      ← SSR auth client
├── src/lib/auth.ts          ← requireLogin()
└── src/styles/global.css    ← legacy tokens (account.astro only)
```