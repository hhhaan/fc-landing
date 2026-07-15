export type ActivityKind = "roast" | "machine" | "auth";

export type ActivityEvent = {
  id: string;
  kind: ActivityKind;
  at: string;
  userId: string;
  email: string | null;
  displayName: string | null;
  plan: string;
  summary: string;
};

export type ActivityTopUser = {
  userId: string;
  email: string | null;
  displayName: string | null;
  plan: string;
  events7d: number;
  lastProductAt: string | null;
  lastAuthAt: string | null;
};

import type { CountryAgg, GeoPoint, SessionIpRow } from "@/shared/api/geo/types";

export type ActivityMap = {
  /** Product-active users (30d) located via last session IP */
  points: GeoPoint[];
  countries: CountryAgg[];
  unresolved: SessionIpRow[];
  /** Product-active users with no resolvable session IP */
  missingIpUsers: number;
};

export type ActivityData = {
  kpis: {
    productActive24h: number;
    productActive7d: number;
    productActive30d: number;
    roasts7d: number;
    machineConnects7d: number;
    authActive7d: number;
  };
  dauSeries: { date: string; users: number; roasts: number }[];
  feed: ActivityEvent[];
  topUsers: ActivityTopUser[];
  map: ActivityMap;
  generatedAt: string;
};
