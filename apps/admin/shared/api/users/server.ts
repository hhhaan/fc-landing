import "server-only";
import type { AdminUser } from "./types";
export type { AdminUser };

import { getAdminClient } from "@/shared/lib/supabase/admin";

type SubRow = {
  user_id: string;
  status: string;
  started_at: string | null;
  created_at: string;
  current_period_start: string | null;
  recurring_interval: string | null;
};

/** Prefer active/past_due, then canceling, then anything with a start date. */
function subRank(status: string): number {
  const s = status.toLowerCase();
  if (s === "active" || s === "past_due") return 0;
  if (s === "trialing") return 1;
  if (s === "canceled" || s === "cancelled" || s === "revoked") return 3;
  return 2;
}

/**
 * Billing-cycle month number (1-based), anchored on period dates — not calendar
 * tenure from "today". Uses started_at (fallback created_at) → current_period_start.
 */
export function billingMonthsFromPeriod(
  startedAt: string | null,
  createdAt: string,
  currentPeriodStart: string | null,
  status: string,
): number | null {
  const st = status.toLowerCase();
  if (st === "trialing") return null;

  const startIso = startedAt ?? createdAt;
  if (!startIso) return null;

  const start = new Date(startIso);
  const period = new Date(currentPeriodStart ?? startIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(period.getTime())) return null;

  const months =
    (period.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    (period.getUTCMonth() - start.getUTCMonth()) +
    1;

  return Math.max(1, months);
}

function billingDayFrom(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.getUTCDate();
}

function pickSub(subs: SubRow[]): SubRow | null {
  if (subs.length === 0) return null;
  return [...subs].sort((a, b) => {
    const r = subRank(a.status) - subRank(b.status);
    if (r !== 0) return r;
    const aStart = a.started_at ?? a.created_at;
    const bStart = b.started_at ?? b.created_at;
    return bStart.localeCompare(aStart);
  })[0];
}

export async function getUsers(): Promise<AdminUser[]> {
  const sb = getAdminClient();
  const [rosterRes, subsRes] = await Promise.all([
    sb.rpc("admin_user_roster"),
    sb
      .from("subscriptions")
      .select(
        "user_id, status, started_at, created_at, current_period_start, recurring_interval",
      )
      .limit(2000),
  ]);

  if (rosterRes.error) throw rosterRes.error;
  if (subsRes.error) throw subsRes.error;

  const byUser = new Map<string, SubRow[]>();
  for (const s of subsRes.data ?? []) {
    const list = byUser.get(s.user_id) ?? [];
    list.push(s);
    byUser.set(s.user_id, list);
  }

  return (rosterRes.data ?? []).map((u) => {
    const sub = pickSub(byUser.get(u.id) ?? []);
    const billing_months = sub
      ? billingMonthsFromPeriod(
          sub.started_at,
          sub.created_at,
          sub.current_period_start,
          sub.status,
        )
      : null;
    const billing_day = sub
      ? billingDayFrom(sub.current_period_start ?? sub.started_at ?? sub.created_at)
      : null;

    return {
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      provider: u.provider,
      display_name: u.display_name,
      business_name: u.business_name,
      plan: u.plan,
      polar_customer_id: u.polar_customer_id,
      roast_count: u.roast_count,
      billing_months,
      billing_day,
      subscription_status: sub?.status ?? null,
      recurring_interval: sub?.recurring_interval ?? null,
    };
  });
}
