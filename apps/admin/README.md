# First Crack · Ops Console (`@fc/admin`)

Personal business operations dashboard for First Crack. Lives in the **fc-landing** monorepo as `apps/admin`.

## Stack

- Next.js 16 (App Router) + Tailwind 4
- Supabase service role (server-only reads)
- MapLibre GL (session IP → country activity)
- Simple password gate

## Monorepo commands (from `fc-landing` root)

```bash
pnpm install
cp apps/admin/.env.example apps/admin/.env.local
# fill SUPABASE_SERVICE_ROLE_KEY + ADMIN_PASSWORD + ADMIN_SESSION_SECRET

pnpm dev:admin      # http://localhost:3000
pnpm build:admin
```

Or from this package:

```bash
pnpm --filter @fc/admin dev
```

## Pages

| Route | Purpose |
|-------|---------|
| `/` | KPI overview, roast sparkline, recent users |
| `/map` | Global activity map from auth session IPs |
| `/users` | Full user roster |
| `/coupons` | Polar single-use coupon pool (create / issue / track) — see [docs/coupons.md](./docs/coupons.md) |
| `/billing` | Plans / Polar / subscriptions (legacy redirect → revenue) |
| `/system` | Table counts, cron runs, machine logs |

## Supabase

Admin SQL helpers / grants may live under `apps/admin/supabase/migrations/`. Product schema SSoT for the app remains **fc-desktop** `supabase/migrations` unless noted.
