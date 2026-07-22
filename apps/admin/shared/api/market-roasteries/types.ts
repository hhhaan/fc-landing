export type MarketCode = 'KR' | 'JP' | 'US' | 'HK' | 'TW' | 'EU';

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
};

export type MarketRoasteriesResponse = {
    total: number;
    limit: number;
    offset: number;
    byMarket: Record<string, number>;
    items: MarketRoastery[];
    generatedAt: string;
};

export type MarketRoasteriesQuery = {
    market?: MarketCode | 'ALL';
    q?: string;
    limit?: number;
    offset?: number;
};
