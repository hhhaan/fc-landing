# Admin Dashboard Implementation Plan

> Executed inline after design approval (2026-07-10).

**Goal:** Ship First Crack personal ops console in `fc-admin`.

**Architecture:** Next.js App Router + Supabase service role + MapLibre + password gate.

**Tech Stack:** Next 16, Tailwind 4, @supabase/supabase-js, maplibre-gl, recharts, lucide-react

## Tasks (completed)

- [x] Design spec
- [x] Supabase types pull + admin RPCs migration
- [x] Env + password session gate (`proxy.ts`)
- [x] Data layer (kpis, users, roasts, billing, system, geo)
- [x] Shell (sidebar, topbar, palantir dark theme)
- [x] Pages: Overview, Map, Users, Roasts, Billing, System
- [x] `npm run build` green
