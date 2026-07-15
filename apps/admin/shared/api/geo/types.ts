export type SessionIpRow = {
  ip: string;
  session_count: number;
  user_count: number;
  last_seen: string;
};

export type GeoPoint = {
  ip: string;
  country: string;
  countryCode: string;
  city: string | null;
  lat: number;
  lon: number;
  session_count: number;
  user_count: number;
  last_seen: string;
};

export type CountryAgg = {
  country: string;
  countryCode: string;
  sessions: number;
  users: number;
  ips: number;
  lat: number;
  lon: number;
};

export type GeoData = {
  points: GeoPoint[];
  countries: CountryAgg[];
  unresolved: SessionIpRow[];
  generatedAt: string;
};


