export type MarketCode = 'KR' | 'JP' | 'US' | 'HK' | 'TW' | 'EU' | 'AU' | 'SEA';

export type MarketRoastery = {
    id: string;
    market: MarketCode;
    country: string;
    name: string;
    addr: string;
    lat: number;
    lng: number;
    phone: string | null;
    rating: number | null;
    rating_count: number | null;
    score: number | null;
    maps_url: string | null;
    source: 'diningcode' | 'google';
    g_status: string | null;
    g_name: string | null;
    /** Outreach flag from Supabase `market_roastery_contacts` */
    contacted: boolean;
    contacted_at: string | null;
};

export type SetMarketRoasteryContactedInput = {
    roasteryId: string;
    contacted: boolean;
};

export type SetMarketRoasteryContactedResult = {
    roasteryId: string;
    contacted: boolean;
    contacted_at: string | null;
};

export type HideMarketRoasteryResult = {
    roasteryId: string;
};

/** Slim point for map clustering (no addr/phone/g_*) */
export type MarketRoasteryMapPoint = {
    id: string;
    market: MarketCode;
    name: string;
    lat: number;
    lng: number;
    rating: number | null;
    maps_url: string | null;
};

export type MarketRoasteriesResponse = {
    total: number;
    limit: number;
    offset: number;
    byMarket: Record<string, number>;
    /** Contacted count per market code */
    contactedByMarket: Record<string, number>;
    items: MarketRoastery[];
    generatedAt: string;
};

export type MarketRoasteriesMapResponse = {
    total: number;
    byMarket: Record<string, number>;
    contactedByMarket: Record<string, number>;
    points: MarketRoasteryMapPoint[];
    generatedAt: string;
};

export type MarketRoasteriesQuery = {
    market?: MarketCode | 'ALL';
    q?: string;
    limit?: number;
    offset?: number;
    view?: 'list' | 'map';
};
