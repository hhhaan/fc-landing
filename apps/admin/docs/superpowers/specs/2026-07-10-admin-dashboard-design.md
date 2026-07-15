# First Crack Admin Dashboard Design

**Date:** 2026-07-10  
**Status:** Approved  
**App:** `fc-admin` (Next.js 16)

## Goal

Personal high-quality **business operations dashboard** for First Crack. Not production multi-admin SaaS — single-operator command center with Palantir-like density and dark aesthetic.

## Approach

- Next.js App Router + Tailwind 4
- Supabase **service role** (server-only) to read across RLS
- IP geolocation from `auth.sessions.ip` → MapLibre world map
- Simple password gate (`ADMIN_PASSWORD` cookie)
- Sidebar shell: Overview · Map · Users · Roasts · Billing · System

## Data sources

| Page | Sources |
|------|---------|
| Overview | profiles, auth.users, roast_sessions, day plans, subscriptions aggregates |
| Map | `admin_auth_session_ips()` RPC + free IP geolocation |
| Users | auth.admin + profiles + roast counts |
| Roasts | roast_sessions time series, level, status |
| Billing | profiles.plan, polar_customer_id, subscriptions |
| System | inventory_alert_runs, machine_connection_logs, table counts |

## Security

- Service role key only in server env
- Cookie session for operator gate
- No user mutation in v1 (read-only)

## Out of scope (v1)

- Multi-admin RBAC, audit log, Polar reprocess UI, write actions
