import "server-only";
import type {
  ActivityData,
  ActivityEvent,
  ActivityTopUser,
} from "./types";
export type { ActivityData };

import { getAdminClient } from "@/shared/lib/supabase/admin";
import { geocodeSessionIps } from "@/shared/lib/ip-geo";
import type { SessionIpRow } from "@/shared/api/geo/types";

const DAY_MS = 864e5;
const ROAST_LIMIT = 5000;
const MACHINE_LIMIT = 5000;
const FEED_LIMIT = 50;
const TOP_USERS = 20;

type Identity = {
  email: string | null;
  displayName: string | null;
  plan: string;
  lastSignInAt: string | null;
};

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function maxIso(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return a >= b ? a : b;
}

export async function getActivityData(): Promise<ActivityData> {
  const sb = getAdminClient();
  const now = Date.now();
  const since30 = new Date(now - 30 * DAY_MS).toISOString();
  const since7 = new Date(now - 7 * DAY_MS).toISOString();
  const since24 = new Date(now - 1 * DAY_MS).toISOString();

  const [roastsRes, machinesRes, rosterRes, authRes] = await Promise.all([
    sb
      .from("roast_sessions")
      .select(
        "id, user_id, created_at, roasted_at, status, roast_level, weight_grams",
      )
      .gte("created_at", since30)
      .order("created_at", { ascending: false })
      .limit(ROAST_LIMIT),
    sb
      .from("machine_connection_logs")
      .select(
        "id, user_id, created_at, success, protocol, display_name, roaster_key",
      )
      .gte("created_at", since30)
      .order("created_at", { ascending: false })
      .limit(MACHINE_LIMIT),
    sb.rpc("admin_user_roster"),
    sb.rpc("admin_auth_user_activity"),
  ]);

  if (roastsRes.error) throw roastsRes.error;
  if (machinesRes.error) throw machinesRes.error;
  if (rosterRes.error) throw rosterRes.error;
  if (authRes.error) throw authRes.error;

  const identity = new Map<string, Identity>();
  for (const u of rosterRes.data ?? []) {
    identity.set(u.id, {
      email: u.email ?? null,
      displayName: u.display_name ?? null,
      plan: u.plan ?? "unknown",
      lastSignInAt: u.last_sign_in_at ?? null,
    });
  }

  const authLastSeen = new Map<string, string>();
  const authLastIp = new Map<string, string>();
  for (const row of authRes.data ?? []) {
    if (row.user_id && row.last_seen) {
      authLastSeen.set(row.user_id, row.last_seen);
    }
    if (row.user_id && row.last_ip) {
      authLastIp.set(row.user_id, row.last_ip);
    }
  }

  const idOf = (userId: string): Identity =>
    identity.get(userId) ?? {
      email: null,
      displayName: null,
      plan: "unknown",
      lastSignInAt: null,
    };

  const productEvents: {
    userId: string;
    at: string;
    kind: "roast" | "machine";
  }[] = [];
  const feedCandidates: ActivityEvent[] = [];

  for (const r of roastsRes.data ?? []) {
    const at = r.roasted_at ?? r.created_at;
    if (!at || at < since30) continue;
    productEvents.push({ userId: r.user_id, at, kind: "roast" });
    const who = idOf(r.user_id);
    const level = r.roast_level ? ` · ${r.roast_level}` : "";
    const grams =
      r.weight_grams != null ? ` · ${Math.round(r.weight_grams)}g` : "";
    const status = r.status ? ` · ${r.status}` : "";
    feedCandidates.push({
      id: `roast:${r.id}`,
      kind: "roast",
      at,
      userId: r.user_id,
      email: who.email,
      displayName: who.displayName,
      plan: who.plan,
      summary: `roast${status}${level}${grams}`,
    });
  }

  for (const m of machinesRes.data ?? []) {
    const at = m.created_at;
    if (!at || at < since30) continue;
    productEvents.push({ userId: m.user_id, at, kind: "machine" });
    const who = idOf(m.user_id);
    const ok = m.success ? "ok" : "fail";
    const name = m.display_name || m.roaster_key || m.protocol || "machine";
    feedCandidates.push({
      id: `machine:${m.id}`,
      kind: "machine",
      at,
      userId: m.user_id,
      email: who.email,
      displayName: who.displayName,
      plan: who.plan,
      summary: `machine · ${ok} · ${name}`,
    });
  }

  // Auth feed: real sign-ins only (not sticky session.updated_at)
  for (const [userId, who] of identity) {
    const at = who.lastSignInAt;
    if (!at || at < since30) continue;
    feedCandidates.push({
      id: `auth:${userId}:${at}`,
      kind: "auth",
      at,
      userId,
      email: who.email,
      displayName: who.displayName,
      plan: who.plan,
      summary: "auth · sign-in",
    });
  }

  feedCandidates.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  const feed = feedCandidates.slice(0, FEED_LIMIT);

  const productUsers24 = new Set<string>();
  const productUsers7 = new Set<string>();
  const productUsers30 = new Set<string>();
  let roasts7d = 0;
  let machineConnects7d = 0;

  const dauUsers = new Map<string, Set<string>>();
  const dauRoasts = new Map<string, number>();
  for (let i = 29; i >= 0; i--) {
    const key = new Date(now - i * DAY_MS).toISOString().slice(0, 10);
    dauUsers.set(key, new Set());
    dauRoasts.set(key, 0);
  }

  // Per product-active user: event count + last product at (for map weighting)
  const productByUser = new Map<
    string,
    { events: number; lastAt: string }
  >();

  for (const e of productEvents) {
    if (e.at >= since30) productUsers30.add(e.userId);
    if (e.at >= since7) {
      productUsers7.add(e.userId);
      if (e.kind === "roast") roasts7d += 1;
      if (e.kind === "machine") machineConnects7d += 1;
    }
    if (e.at >= since24) productUsers24.add(e.userId);

    const key = dayKey(e.at);
    const set = dauUsers.get(key);
    if (set) set.add(e.userId);
    if (e.kind === "roast" && dauRoasts.has(key)) {
      dauRoasts.set(key, (dauRoasts.get(key) ?? 0) + 1);
    }

    const cur = productByUser.get(e.userId);
    if (!cur) {
      productByUser.set(e.userId, { events: 1, lastAt: e.at });
    } else {
      cur.events += 1;
      if (e.at > cur.lastAt) cur.lastAt = e.at;
    }
  }

  const authActive7d = new Set<string>();
  for (const [userId, who] of identity) {
    const sessionAt = authLastSeen.get(userId) ?? null;
    const lastAuth = maxIso(who.lastSignInAt, sessionAt);
    if (lastAuth && lastAuth >= since7) authActive7d.add(userId);
  }
  for (const [userId, lastSeen] of authLastSeen) {
    if (lastSeen >= since7) authActive7d.add(userId);
  }

  const dauSeries = [...dauUsers.entries()].map(([date, users]) => ({
    date,
    users: users.size,
    roasts: dauRoasts.get(date) ?? 0,
  }));

  const perUser7 = new Map<
    string,
    { events7d: number; lastProductAt: string | null }
  >();
  for (const e of productEvents) {
    if (e.at < since7) continue;
    const cur = perUser7.get(e.userId) ?? {
      events7d: 0,
      lastProductAt: null,
    };
    cur.events7d += 1;
    cur.lastProductAt = maxIso(cur.lastProductAt, e.at);
    perUser7.set(e.userId, cur);
  }

  const topUsers: ActivityTopUser[] = [...perUser7.entries()]
    .map(([userId, stats]) => {
      const who = idOf(userId);
      const sessionAt = authLastSeen.get(userId) ?? null;
      return {
        userId,
        email: who.email,
        displayName: who.displayName,
        plan: who.plan,
        events7d: stats.events7d,
        lastProductAt: stats.lastProductAt,
        lastAuthAt: maxIso(who.lastSignInAt, sessionAt),
      };
    })
    .sort((a, b) => {
      if (b.events7d !== a.events7d) return b.events7d - a.events7d;
      return (b.lastProductAt ?? "").localeCompare(a.lastProductAt ?? "");
    })
    .slice(0, TOP_USERS);

  // Map: product-active users (30d) → last session IP → geocode
  const ipAgg = new Map<
    string,
    { events: number; users: Set<string>; lastSeen: string }
  >();
  let missingIpUsers = 0;
  for (const userId of productUsers30) {
    const ip = authLastIp.get(userId);
    const stats = productByUser.get(userId);
    if (!ip || !stats) {
      missingIpUsers += 1;
      continue;
    }
    const lastSeen =
      authLastSeen.get(userId) ?? stats.lastAt;
    const cur = ipAgg.get(ip);
    if (!cur) {
      ipAgg.set(ip, {
        events: stats.events,
        users: new Set([userId]),
        lastSeen,
      });
    } else {
      cur.events += stats.events;
      cur.users.add(userId);
      if (lastSeen > cur.lastSeen) cur.lastSeen = lastSeen;
    }
  }

  const mapRows: SessionIpRow[] = [...ipAgg.entries()].map(([ip, v]) => ({
    ip,
    session_count: v.events,
    user_count: v.users.size,
    last_seen: v.lastSeen,
  }));
  // Heaviest product locations first for free geo API budget
  mapRows.sort((a, b) => b.session_count - a.session_count);

  const geo = await geocodeSessionIps(mapRows);

  return {
    kpis: {
      productActive24h: productUsers24.size,
      productActive7d: productUsers7.size,
      productActive30d: productUsers30.size,
      roasts7d,
      machineConnects7d,
      authActive7d: authActive7d.size,
    },
    dauSeries,
    feed,
    topUsers,
    map: {
      points: geo.points,
      countries: geo.countries,
      unresolved: geo.unresolved,
      missingIpUsers,
    },
    generatedAt: new Date().toISOString(),
  };
}
