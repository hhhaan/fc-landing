'use client';

import maplibregl from 'maplibre-gl';
import { useEffect, useRef, useState } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { MarketCode, MarketRoasteryMapPoint } from '@/shared/api/market-roasteries/types';

const MARKET_COLORS: Record<MarketCode, string> = {
    KR: '#81FBA5',
    JP: '#44BFFC',
    US: '#F5A623',
    HK: '#E879F9',
    TW: '#FBBF24',
    EU: '#A78BFA',
    AU: '#34D399',
    SEA: '#F472B6',
};

const MARKET_CENTERS: Record<MarketCode | 'ALL', { center: [number, number]; zoom: number }> = {
    ALL: { center: [20, 25], zoom: 1.4 },
    KR: { center: [127.5, 36.2], zoom: 6.2 },
    JP: { center: [138.2, 36.5], zoom: 5.2 },
    US: { center: [-98.5, 39], zoom: 3.4 },
    HK: { center: [114.17, 22.32], zoom: 10.5 },
    TW: { center: [121.0, 23.7], zoom: 7.2 },
    EU: { center: [10, 50], zoom: 3.6 },
    AU: { center: [134, -25], zoom: 3.8 },
    SEA: { center: [110, 5], zoom: 3.6 },
};

type Props = {
    points: MarketRoasteryMapPoint[];
    market: MarketCode | 'ALL';
    label?: string;
    className?: string;
};

function toFc(points: MarketRoasteryMapPoint[]): GeoJSON.FeatureCollection {
    return {
        type: 'FeatureCollection',
        features: points.map((p) => ({
            type: 'Feature',
            properties: {
                id: p.id,
                name: p.name,
                market: p.market,
                rating: p.rating,
                maps_url: p.maps_url,
            },
            geometry: {
                type: 'Point',
                coordinates: [p.lng, p.lat],
            },
        })),
    };
}

function escapeHtml(s: string): string {
    return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

export function RoasteriesMap({ points, market, label = 'Market roasteries', className }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);
    const dataRef = useRef(points);
    const [error, setError] = useState<string | null>(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        dataRef.current = points;
    }, [points]);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        let cancelled = false;
        let ro: ResizeObserver | null = null;
        let map: maplibregl.Map | null = null;
        let t1 = 0;
        let t2 = 0;

        try {
            // Initial camera only — market filter updates fly via the data effect below.
            const initial = MARKET_CENTERS.ALL;
            map = new maplibregl.Map({
                container: el,
                style: {
                    version: 8,
                    glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
                    sources: {
                        basemap: {
                            type: 'raster',
                            tiles: ['https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png'],
                            tileSize: 256,
                            attribution: '© CARTO · © OpenStreetMap',
                        },
                    },
                    layers: [
                        {
                            id: 'basemap',
                            type: 'raster',
                            source: 'basemap',
                            minzoom: 0,
                            maxzoom: 19,
                        },
                    ],
                },
                center: initial.center,
                zoom: initial.zoom,
                attributionControl: false,
            });

            map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
            map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

            map.on('error', (e) => {
                const msg = e.error?.message ?? 'Map error';
                if (/WebGL|Failed to initialize/i.test(msg)) setError(msg);
            });

            map.on('load', () => {
                if (cancelled || !map) return;

                map.addSource('roasteries', {
                    type: 'geojson',
                    data: toFc(dataRef.current),
                    cluster: true,
                    clusterMaxZoom: 14,
                    clusterRadius: 48,
                });

                map.addLayer({
                    id: 'clusters',
                    type: 'circle',
                    source: 'roasteries',
                    filter: ['has', 'point_count'],
                    paint: {
                        'circle-color': '#81FBA5',
                        'circle-opacity': 0.22,
                        'circle-radius': ['step', ['get', 'point_count'], 16, 25, 22, 100, 30, 500, 40],
                        'circle-stroke-width': 1.5,
                        'circle-stroke-color': '#81FBA5',
                        'circle-stroke-opacity': 0.55,
                    },
                });

                map.addLayer({
                    id: 'cluster-count',
                    type: 'symbol',
                    source: 'roasteries',
                    filter: ['has', 'point_count'],
                    layout: {
                        'text-field': ['get', 'point_count_abbreviated'],
                        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
                        'text-size': 11,
                    },
                    paint: {
                        'text-color': '#e8eaed',
                    },
                });

                map.addLayer({
                    id: 'unclustered',
                    type: 'circle',
                    source: 'roasteries',
                    filter: ['!', ['has', 'point_count']],
                    paint: {
                        'circle-radius': 5,
                        'circle-color': [
                            'match',
                            ['get', 'market'],
                            'KR',
                            MARKET_COLORS.KR,
                            'JP',
                            MARKET_COLORS.JP,
                            'US',
                            MARKET_COLORS.US,
                            'HK',
                            MARKET_COLORS.HK,
                            'TW',
                            MARKET_COLORS.TW,
                            'EU',
                            MARKET_COLORS.EU,
                            'AU',
                            MARKET_COLORS.AU,
                            'SEA',
                            MARKET_COLORS.SEA,
                            '#81FBA5',
                        ],
                        'circle-opacity': 0.92,
                        'circle-stroke-width': 1,
                        'circle-stroke-color': '#07090b',
                    },
                });

                map.on('click', 'clusters', (e) => {
                    if (!map) return;
                    const f = e.features?.[0];
                    if (f?.geometry.type !== 'Point') return;
                    const clusterId = f.properties?.cluster_id as number | undefined;
                    const source = map.getSource('roasteries') as maplibregl.GeoJSONSource;
                    if (clusterId == null) return;
                    source.getClusterExpansionZoom(clusterId).then((zoom) => {
                        if (!map || f.geometry.type !== 'Point') return;
                        const coords = f.geometry.coordinates as [number, number];
                        map.easeTo({ center: coords, zoom });
                    });
                });

                map.on('click', 'unclustered', (e) => {
                    if (!map) return;
                    const f = e.features?.[0];
                    if (!f) return;
                    const props = f.properties as {
                        name?: string;
                        market?: string;
                        rating?: number | string | null;
                        maps_url?: string | null;
                    };
                    const maps =
                        props.maps_url ||
                        `https://www.google.com/maps/search/?api=1&query=${e.lngLat.lat},${e.lngLat.lng}`;
                    const ratingVal = props.rating;
                    const rating = ratingVal != null && ratingVal !== '' ? `<br/>rating: ${ratingVal}` : '';
                    new maplibregl.Popup({
                        closeButton: false,
                        className: 'fc-map-popup',
                        maxWidth: '260px',
                    })
                        .setLngLat(e.lngLat)
                        .setHTML(
                            `<div style="font-family:ui-monospace,monospace;font-size:11px;line-height:1.45">
                <strong>${escapeHtml(String(props.name ?? ''))}</strong><br/>
                market: ${escapeHtml(String(props.market ?? ''))}${rating}<br/>
                <a href="${escapeHtml(String(maps))}" target="_blank" rel="noreferrer" style="color:#81FBA5">Open maps</a>
              </div>`,
                        )
                        .addTo(map);
                });

                for (const layer of ['clusters', 'unclustered'] as const) {
                    map.on('mouseenter', layer, () => {
                        if (map) map.getCanvas().style.cursor = 'pointer';
                    });
                    map.on('mouseleave', layer, () => {
                        if (map) map.getCanvas().style.cursor = '';
                    });
                }

                map.resize();
                setReady(true);
            });

            ro = new ResizeObserver(() => map?.resize());
            ro.observe(el);
            requestAnimationFrame(() => map?.resize());
            t1 = window.setTimeout(() => map?.resize(), 120);
            t2 = window.setTimeout(() => map?.resize(), 400);
            mapRef.current = map;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to init map');
        }

        return () => {
            cancelled = true;
            window.clearTimeout(t1);
            window.clearTimeout(t2);
            ro?.disconnect();
            map?.remove();
            mapRef.current = null;
        };
    }, []);

    useEffect(() => {
        const map = mapRef.current;
        if (!map || !ready) return;

        const src = map.getSource('roasteries') as maplibregl.GeoJSONSource | undefined;
        src?.setData(toFc(points));

        if (points.length > 0) {
            if (market === 'ALL' && points.length > 2000) {
                const cam = MARKET_CENTERS.ALL;
                map.easeTo({ center: cam.center, zoom: cam.zoom, duration: 500 });
            } else {
                const bounds = new maplibregl.LngLatBounds();
                for (const p of points) bounds.extend([p.lng, p.lat]);
                map.fitBounds(bounds, { padding: 64, maxZoom: market === 'HK' ? 12 : 8, duration: 500 });
            }
        } else {
            const cam = MARKET_CENTERS[market] ?? MARKET_CENTERS.ALL;
            map.easeTo({ center: cam.center, zoom: cam.zoom, duration: 400 });
        }

        map.resize();
    }, [points, market, ready]);

    return (
        <div
            className={
                className ??
                'relative h-full min-h-[420px] w-full overflow-hidden border border-[var(--border)] bg-[#0a0d10]'
            }
        >
            <div ref={containerRef} className="absolute inset-0 h-full w-full" />

            <div className="pointer-events-none absolute left-3 top-3 z-10 border border-[var(--border)] bg-[var(--panel)]/90 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-[var(--muted)] backdrop-blur">
                {label}
                {ready ? ' · live' : ' · loading'}
            </div>

            <div className="pointer-events-none absolute bottom-3 left-3 z-10 flex flex-wrap gap-1.5 border border-[var(--border)] bg-[var(--panel)]/90 px-2 py-1.5 backdrop-blur">
                {(Object.keys(MARKET_COLORS) as MarketCode[]).map((code) => (
                    <span
                        key={code}
                        className="inline-flex items-center gap-1 font-mono text-[10px] text-[var(--muted)]"
                    >
                        <span
                            className="inline-block h-2 w-2 rounded-full"
                            style={{ background: MARKET_COLORS[code] }}
                        />
                        {code}
                    </span>
                ))}
            </div>

            {error && (
                <div className="absolute inset-x-3 bottom-3 z-10 border border-[var(--bad)]/40 bg-[var(--panel)] px-3 py-2 font-mono text-[11px] text-[var(--bad)]">
                    Map error: {error}
                </div>
            )}

            {!ready && !error && (
                <div className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center bg-[#0a0d10]/60 font-mono text-[11px] text-[var(--muted)]">
                    Initializing map…
                </div>
            )}
        </div>
    );
}
