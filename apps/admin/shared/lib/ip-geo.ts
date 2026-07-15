import type {
  CountryAgg,
  GeoPoint,
  SessionIpRow,
} from "@/shared/api/geo/types";

type IpWho = {
  success?: boolean;
  country?: string;
  country_code?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
};

export async function lookupIp(
  ip: string,
): Promise<Omit<
  GeoPoint,
  "ip" | "session_count" | "user_count" | "last_seen"
> | null> {
  if (
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    ip.startsWith("127.") ||
    ip === "::1"
  ) {
    return null;
  }

  try {
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`);
    if (!res.ok) return null;
    const data = (await res.json()) as IpWho;
    if (
      data.success === false ||
      data.latitude == null ||
      data.longitude == null
    ) {
      return null;
    }
    return {
      country: data.country ?? "Unknown",
      countryCode: (data.country_code ?? "XX").toUpperCase(),
      city: data.city ?? null,
      lat: data.latitude,
      lon: data.longitude,
    };
  } catch {
    return null;
  }
}

export async function geocodeSessionIps(rows: SessionIpRow[]): Promise<{
  points: GeoPoint[];
  countries: CountryAgg[];
  unresolved: SessionIpRow[];
}> {
  const points: GeoPoint[] = [];
  const unresolved: SessionIpRow[] = [];

  const chunk = 4;
  for (let i = 0; i < rows.length; i += chunk) {
    const batch = rows.slice(i, i + chunk);
    const results = await Promise.all(
      batch.map(async (row) => {
        const geo = await lookupIp(row.ip);
        return { row, geo };
      }),
    );
    for (const { row, geo } of results) {
      if (!geo) {
        unresolved.push(row);
        continue;
      }
      points.push({
        ip: row.ip,
        ...geo,
        session_count: row.session_count,
        user_count: row.user_count,
        last_seen: row.last_seen,
      });
    }
  }

  const countryMap = new Map<string, CountryAgg>();
  for (const p of points) {
    const existing = countryMap.get(p.countryCode);
    if (!existing) {
      countryMap.set(p.countryCode, {
        country: p.country,
        countryCode: p.countryCode,
        sessions: p.session_count,
        users: p.user_count,
        ips: 1,
        lat: p.lat,
        lon: p.lon,
      });
    } else {
      existing.sessions += p.session_count;
      existing.users += p.user_count;
      existing.ips += 1;
      existing.lat = (existing.lat * (existing.ips - 1) + p.lat) / existing.ips;
      existing.lon = (existing.lon * (existing.ips - 1) + p.lon) / existing.ips;
    }
  }

  return {
    points,
    countries: [...countryMap.values()].sort((a, b) => b.sessions - a.sessions),
    unresolved,
  };
}
