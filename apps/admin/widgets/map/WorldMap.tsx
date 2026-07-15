"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { CountryAgg, GeoPoint } from "@/shared/api/geo/types";

type Props = {
  countries: CountryAgg[];
  points: GeoPoint[];
  /** Overlay badge text */
  label?: string;
  className?: string;
};

function toCountryFc(countries: CountryAgg[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: countries.map((c) => ({
      type: "Feature",
      properties: {
        name: c.country,
        code: c.countryCode,
        sessions: c.sessions,
        users: c.users,
      },
      geometry: {
        type: "Point",
        coordinates: [c.lon, c.lat],
      },
    })),
  };
}

function toIpFc(points: GeoPoint[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: points.map((p) => ({
      type: "Feature",
      properties: {
        ip: p.ip,
        city: p.city,
        country: p.country,
        sessions: p.session_count,
      },
      geometry: {
        type: "Point",
        coordinates: [p.lon, p.lat],
      },
    })),
  };
}

export function WorldMap({
  countries,
  points,
  label = "Session activity · IP geo",
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const dataRef = useRef({ countries, points });
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // Sync latest props into ref via effect instead of during render
  useEffect(() => {
    dataRef.current = { countries, points };
  }, [countries, points]);

  // Init map once
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let cancelled = false;
    let ro: ResizeObserver | null = null;
    let map: maplibregl.Map | null = null;
    let t1 = 0;
    let t2 = 0;

    try {
      map = new maplibregl.Map({
        container: el,
        style: {
          version: 8,
          sources: {
            basemap: {
              type: "raster",
              tiles: [
                "https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
              ],
              tileSize: 256,
              attribution: "© CARTO · © OpenStreetMap",
            },
          },
          layers: [
            {
              id: "basemap",
              type: "raster",
              source: "basemap",
              minzoom: 0,
              maxzoom: 19,
            },
          ],
        },
        center: [127.0, 37.5],
        zoom: 3.2,
        attributionControl: false,
      });

      map.addControl(
        new maplibregl.NavigationControl({ showCompass: false }),
        "top-right",
      );
      map.addControl(
        new maplibregl.AttributionControl({ compact: true }),
        "bottom-right",
      );

      map.on("error", (e) => {
        const msg = e.error?.message ?? "Map error";
        if (/WebGL|Failed to initialize/i.test(msg)) setError(msg);
      });

      map.on("load", () => {
        if (cancelled || !map) return;

        const { countries: c, points: p } = dataRef.current;
        const maxSessions = Math.max(...c.map((x) => x.sessions), 1);

        map.addSource("countries", {
          type: "geojson",
          data: toCountryFc(c),
        });
        map.addSource("ips", {
          type: "geojson",
          data: toIpFc(p),
        });

        map.addLayer({
          id: "country-glow",
          type: "circle",
          source: "countries",
          paint: {
            "circle-radius": [
              "interpolate",
              ["linear"],
              ["get", "sessions"],
              1,
              18,
              maxSessions,
              48,
            ],
            "circle-color": "#81FBA5",
            "circle-opacity": 0.15,
            "circle-blur": 0.75,
          },
        });

        map.addLayer({
          id: "country-core",
          type: "circle",
          source: "countries",
          paint: {
            "circle-radius": [
              "interpolate",
              ["linear"],
              ["get", "sessions"],
              1,
              6,
              maxSessions,
              16,
            ],
            "circle-color": "#81FBA5",
            "circle-opacity": 0.9,
            "circle-stroke-width": 1.5,
            "circle-stroke-color": "#07090b",
          },
        });

        map.addLayer({
          id: "ip-points",
          type: "circle",
          source: "ips",
          paint: {
            "circle-radius": 4,
            "circle-color": "#44BFFC",
            "circle-opacity": 0.95,
            "circle-stroke-width": 1,
            "circle-stroke-color": "#07090b",
          },
        });

        map.on("click", "country-core", (e) => {
          if (!map) return;
          const f = e.features?.[0];
          if (!f) return;
          const props = f.properties as {
            name: string;
            sessions: number;
            users: number;
            code: string;
          };
          new maplibregl.Popup({
            closeButton: false,
            className: "fc-map-popup",
            maxWidth: "240px",
          })
            .setLngLat(e.lngLat)
            .setHTML(
              `<div style="font-family:ui-monospace,monospace;font-size:11px;line-height:1.45">
                <strong>${props.name}</strong> (${props.code})<br/>
                sessions: ${props.sessions}<br/>
                users: ${props.users}
              </div>`,
            )
            .addTo(map);
        });

        map.on("mouseenter", "country-core", () => {
          map?.getCanvas() && (map.getCanvas().style.cursor = "pointer");
        });
        map.on("mouseleave", "country-core", () => {
          map?.getCanvas() && (map.getCanvas().style.cursor = "");
        });

        if (p.length > 0) {
          const bounds = new maplibregl.LngLatBounds();
          for (const pt of p) bounds.extend([pt.lon, pt.lat]);
          map.fitBounds(bounds, { padding: 72, maxZoom: 5, duration: 600 });
        }

        map.resize();
        setReady(true);
      });

      ro = new ResizeObserver(() => {
        map?.resize();
      });
      ro.observe(el);

      requestAnimationFrame(() => map?.resize());
      t1 = window.setTimeout(() => map?.resize(), 120);
      t2 = window.setTimeout(() => map?.resize(), 400);

      mapRef.current = map;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to init map");
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

  // Update sources when data changes after ready
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    const countriesSrc = map.getSource("countries") as
      | maplibregl.GeoJSONSource
      | undefined;
    const ipsSrc = map.getSource("ips") as maplibregl.GeoJSONSource | undefined;

    countriesSrc?.setData(toCountryFc(countries));
    ipsSrc?.setData(toIpFc(points));

    if (points.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      for (const p of points) bounds.extend([p.lon, p.lat]);
      map.fitBounds(bounds, { padding: 72, maxZoom: 5, duration: 400 });
    }

    map.resize();
  }, [countries, points, ready]);

  return (
    <div
      className={
        className ??
        "relative h-[min(70vh,640px)] w-full min-h-[420px] overflow-hidden border border-[var(--border)] bg-[#0a0d10]"
      }
    >
      <div ref={containerRef} className="absolute inset-0 h-full w-full" />

      <div className="pointer-events-none absolute left-3 top-3 z-10 border border-[var(--border)] bg-[var(--panel)]/90 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-[var(--muted)] backdrop-blur">
        {label}
        {ready ? " · live" : " · loading"}
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
