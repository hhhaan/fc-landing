import "server-only";
import type { SystemData } from "./types";
export type { SystemData };

import { getAdminClient } from "@/shared/lib/supabase/admin";
import { BILLABLE_STATUSES } from "@/shared/lib/pricing";

const TABLE_NAMES = [
  "profiles",
  "subscriptions",
  "inventory_alerts",
  "inventory_alert_runs",
  "machine_connection_logs",
  "roast_sessions",
  "roast_day_plans",
  "beans",
  "blends",
] as const;

export async function getSystemData(): Promise<SystemData> {
  const sb = getAdminClient();

  const counts = await Promise.all(
    TABLE_NAMES.map(async (name) => {
      const { count, error } = await sb
        .from(name)
        .select("id", { count: "exact", head: true });
      if (error) return { name, count: -1 };
      return { name, count: count ?? 0 };
    }),
  );

  const [runsRes, logsRes, profilesRes, subsRes, sessionIpsRes] =
    await Promise.all([
      sb
        .from("inventory_alert_runs")
        .select(
          "id, started_at, finished_at, status, users_processed, error_message",
        )
        .order("started_at", { ascending: false })
        .limit(25),
      sb
        .from("machine_connection_logs")
        .select(
          "id, user_id, protocol, roaster_key, success, created_at, error_message, display_name",
        )
        .order("created_at", { ascending: false })
        .limit(40),
      sb.from("profiles").select("id, plan, polar_customer_id").limit(1000),
      sb.from("subscriptions").select("id, status").limit(1000),
      sb.rpc("admin_auth_session_ips"),
    ]);

  const alertRuns = runsRes.data ?? [];
  const machineLogs = logsRes.data ?? [];
  const profiles = profilesRes.data ?? [];
  const subs = subsRes.data ?? [];

  const subsystemErrors = [runsRes, logsRes, profilesRes, subsRes, sessionIpsRes]
    .filter((r) => r.error)
    .map((r) => r.error!.message);
  if (subsystemErrors.length) throw new Error(subsystemErrors.join("; "));

  const machineOk = machineLogs.filter((l) => l.success).length;
  const machineFail = machineLogs.filter((l) => !l.success).length;
  const machineTotal = machineLogs.length;

  const polarLinked = profiles.filter((p) => p.polar_customer_id).length;
  const paidPlans = profiles.filter(
    (p) => p.plan && p.plan !== "free" && p.plan !== "unknown",
  ).length;
  const incompleteCheckout = profiles.filter(
    (p) => p.polar_customer_id && (!p.plan || p.plan === "free"),
  ).length;
  const billableSubs = subs.filter((s) =>
    BILLABLE_STATUSES.has((s.status ?? "").toLowerCase()),
  ).length;

  const lastCron = alertRuns[0];
  const since7 = new Date(Date.now() - 7 * 864e5).toISOString();
  const cronFails7d = alertRuns.filter(
    (r) =>
      r.started_at >= since7 &&
      (r.status === "error" || !!r.error_message),
  ).length;
  const CRON_STALE_MS = 3 * 864e5;
  const cronStale =
    !lastCron ||
    Date.now() - new Date(lastCron.started_at).getTime() > CRON_STALE_MS;

  const sessionRows = sessionIpsRes.data ?? [];
  const distinctIps = sessionRows.length;
  const totalSessions = sessionRows.reduce(
    (s, r) => s + Number(r.session_count),
    0,
  );

  const cronHealth = computeCronHealth(lastCron, cronFails7d, cronStale);
  const HARDWARE_FAIL_RATE_BAD = 0.3;
  const hardwareHealth = computeHardwareHealth(
    machineTotal,
    machineOk,
    machineFail,
    HARDWARE_FAIL_RATE_BAD,
  );
  const billingHealth = computeBillingHealth(
    incompleteCheckout,
    polarLinked,
    subs.length,
    billableSubs,
  );

  const health: SystemData["health"] = [
    {
      id: "cron",
      label: "Inventory cron",
      status: cronHealth.status,
      detail: cronHealth.detail,
    },
    {
      id: "billing",
      label: "Billing integrity",
      status: billingHealth.status,
      detail: billingHealth.detail,
    },
    {
      id: "hardware",
      label: "Machine connect",
      status: hardwareHealth.status,
      detail: hardwareHealth.detail,
    },
    {
      id: "auth",
      label: "Auth sessions",
      status: totalSessions > 0 ? "ok" : "idle",
      detail: `${totalSessions} sessions · ${distinctIps} IPs`,
    },
    {
      id: "db",
      label: "Core tables",
      status: counts.some((t) => t.count < 0) ? "bad" : "ok",
      detail: counts.some((t) => t.count < 0)
        ? "Read error on one or more tables"
        : `${profiles.length} profiles · readable`,
    },
  ];

  return {
    health,
    tables: counts,
    alertRuns,
    machineLogs,
    machineSummary: {
      total: machineTotal,
      ok: machineOk,
      fail: machineFail,
      failRate:
        machineTotal > 0
          ? Math.round((machineFail / machineTotal) * 1000) / 10
          : null,
    },
    billingIntegrity: {
      polarLinked,
      paidPlans,
      subscriptionRows: subs.length,
      billableSubs,
      incompleteCheckout,
      orphanNote:
        polarLinked > 0 && subs.length === 0
          ? "Checkout events may not be writing to subscriptions — verify Polar webhook."
          : incompleteCheckout > 0
            ? "Customer created but plan not upgraded — webhook status mapping gap."
            : null,
    },
    sessionGeo: { distinctIps, totalSessions },
    generatedAt: new Date().toISOString(),
  };
}

type HealthEntry = { status: "ok" | "warn" | "bad" | "idle"; detail: string };

function computeCronHealth(
  lastCron: { status: string } | undefined,
  cronFails7d: number,
  cronStale: boolean,
): HealthEntry {
  if (!lastCron) return { status: "idle", detail: "No runs recorded" };
  if (cronStale) return { status: "warn", detail: `Last run stale · ${lastCron.status}` };
  if (cronFails7d > 0) return { status: "warn", detail: `${cronFails7d} fail(s) in 7d · last ${lastCron.status}` };
  return { status: "ok", detail: `Healthy · last ${lastCron.status}` };
}

function computeBillingHealth(
  incompleteCheckout: number,
  polarLinked: number,
  subsLength: number,
  billableSubs: number,
): HealthEntry {
  if (incompleteCheckout > 0)
    return { status: "warn", detail: `${incompleteCheckout} Polar customer(s) still free` };
  if (polarLinked > 0 && subsLength === 0)
    return { status: "warn", detail: "Polar linked but subscriptions empty (webhook?)" };
  return { status: "ok", detail: `${billableSubs} billable · ${subsLength} rows` };
}

function computeHardwareHealth(
  machineTotal: number,
  machineOk: number,
  machineFail: number,
  failRateBad: number,
): HealthEntry {
  if (machineTotal === 0) return { status: "idle", detail: "No connection logs yet" };
  if (machineFail / Math.max(machineTotal, 1) > failRateBad)
    return { status: "bad", detail: `${machineOk} ok / ${machineFail} fail (recent ${machineTotal})` };
  if (machineFail > 0)
    return { status: "warn", detail: `${machineOk} ok / ${machineFail} fail (recent ${machineTotal})` };
  return { status: "ok", detail: `${machineOk} ok / ${machineFail} fail (recent ${machineTotal})` };
}
