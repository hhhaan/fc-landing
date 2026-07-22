#!/usr/bin/env python3
"""Collect US coffee roasteries via Google Places searchText.

Requires GOOGLE_MAPS_API_KEY in env/.env

Usage:
  set -a && source .env && set +a
  python3 scripts/scrape-google-us-roastery.py
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

API = "https://places.googleapis.com/v1/places:searchText"
FIELD_MASK = (
    "places.id,places.displayName,places.formattedAddress,places.location,"
    "places.googleMapsUri,places.types,places.primaryType,places.businessStatus,"
    "places.rating,places.userRatingCount,nextPageToken"
)

# (label, lat, lng, radius_m) — state centers + major metro densification
REGIONS: list[tuple[str, float, float, float]] = [
    # State approx centers
    ("Alabama", 32.81, -86.79, 120000),
    ("Alaska", 61.22, -149.90, 80000),  # Anchorage focus
    ("Arizona", 34.05, -111.09, 150000),
    ("Arkansas", 34.75, -92.29, 120000),
    ("California", 36.78, -119.42, 200000),
    ("Colorado", 39.00, -105.50, 150000),
    ("Connecticut", 41.60, -72.70, 70000),
    ("Delaware", 39.00, -75.50, 50000),
    ("Florida", 27.99, -81.76, 180000),
    ("Georgia", 32.16, -82.90, 140000),
    ("Hawaii", 21.31, -157.86, 50000),  # Honolulu
    ("Idaho", 44.07, -114.74, 140000),
    ("Illinois", 40.00, -89.00, 140000),
    ("Indiana", 39.85, -86.26, 120000),
    ("Iowa", 41.88, -93.10, 130000),
    ("Kansas", 38.50, -98.00, 140000),
    ("Kentucky", 37.84, -84.27, 120000),
    ("Louisiana", 31.00, -92.00, 130000),
    ("Maine", 45.25, -69.00, 120000),
    ("Maryland", 39.05, -76.64, 80000),
    ("Massachusetts", 42.23, -71.53, 90000),
    ("Michigan", 44.31, -85.60, 150000),
    ("Minnesota", 46.00, -94.50, 150000),
    ("Mississippi", 32.74, -89.68, 120000),
    ("Missouri", 38.46, -92.29, 140000),
    ("Montana", 46.88, -110.36, 180000),
    ("Nebraska", 41.50, -99.68, 140000),
    ("Nevada", 38.80, -116.42, 160000),
    ("New Hampshire", 43.45, -71.56, 80000),
    ("New Jersey", 40.06, -74.41, 80000),
    ("New Mexico", 34.52, -105.87, 150000),
    ("New York", 42.95, -75.53, 150000),
    ("North Carolina", 35.63, -79.81, 140000),
    ("North Dakota", 47.55, -101.00, 140000),
    ("Ohio", 40.42, -82.91, 130000),
    ("Oklahoma", 35.48, -97.53, 140000),
    ("Oregon", 44.00, -120.50, 160000),
    ("Pennsylvania", 40.97, -77.73, 140000),
    ("Rhode Island", 41.68, -71.51, 45000),
    ("South Carolina", 33.84, -81.16, 120000),
    ("South Dakota", 44.50, -100.23, 140000),
    ("Tennessee", 35.75, -86.58, 130000),
    ("Texas", 31.00, -99.90, 220000),
    ("Utah", 39.32, -111.09, 140000),
    ("Vermont", 44.00, -72.70, 80000),
    ("Virginia", 37.43, -78.66, 130000),
    ("Washington", 47.40, -120.50, 150000),
    ("West Virginia", 38.60, -80.45, 100000),
    ("Wisconsin", 44.50, -89.50, 140000),
    ("Wyoming", 43.00, -107.50, 160000),
    ("District of Columbia", 38.91, -77.04, 30000),
    # Metro densification
    ("CA_LosAngeles", 34.05, -118.24, 40000),
    ("CA_SanDiego", 32.72, -117.16, 30000),
    ("CA_SanFrancisco", 37.77, -122.42, 25000),
    ("CA_Oakland", 37.80, -122.27, 20000),
    ("CA_SanJose", 37.34, -121.89, 25000),
    ("CA_Sacramento", 38.58, -121.49, 25000),
    ("CA_Berkeley", 37.87, -122.27, 15000),
    ("CA_SantaBarbara", 34.42, -119.70, 20000),
    ("OR_Portland", 45.52, -122.68, 30000),
    ("WA_Seattle", 47.61, -122.33, 30000),
    ("WA_Tacoma", 47.25, -122.44, 20000),
    ("CO_Denver", 39.74, -104.99, 30000),
    ("CO_Boulder", 40.02, -105.27, 15000),
    ("TX_Austin", 30.27, -97.74, 30000),
    ("TX_Houston", 29.76, -95.37, 35000),
    ("TX_Dallas", 32.78, -96.80, 35000),
    ("TX_SanAntonio", 29.42, -98.49, 30000),
    ("NY_NYC", 40.73, -73.99, 25000),
    ("NY_Brooklyn", 40.68, -73.94, 15000),
    ("NY_Buffalo", 42.89, -78.88, 25000),
    ("IL_Chicago", 41.88, -87.63, 30000),
    ("MA_Boston", 42.36, -71.06, 25000),
    ("PA_Philadelphia", 39.95, -75.17, 25000),
    ("PA_Pittsburgh", 40.44, -79.99, 25000),
    ("GA_Atlanta", 33.75, -84.39, 30000),
    ("FL_Miami", 25.76, -80.19, 30000),
    ("FL_Tampa", 27.95, -82.46, 25000),
    ("FL_Orlando", 28.54, -81.38, 25000),
    ("NC_Asheville", 35.60, -82.55, 20000),
    ("NC_Charlotte", 35.23, -80.84, 25000),
    ("NC_Raleigh", 35.78, -78.64, 25000),
    ("TN_Nashville", 36.16, -86.78, 25000),
    ("TN_Memphis", 35.15, -90.05, 25000),
    ("MN_Minneapolis", 44.98, -93.27, 25000),
    ("MI_Detroit", 42.33, -83.05, 30000),
    ("MI_GrandRapids", 42.96, -85.67, 20000),
    ("OH_Columbus", 39.96, -83.00, 25000),
    ("OH_Cleveland", 41.50, -81.69, 25000),
    ("OH_Cincinnati", 39.10, -84.51, 25000),
    ("MO_StLouis", 38.63, -90.20, 25000),
    ("MO_KansasCity", 39.10, -94.58, 25000),
    ("AZ_Phoenix", 33.45, -112.07, 35000),
    ("AZ_Tucson", 32.22, -110.97, 25000),
    ("NV_LasVegas", 36.17, -115.14, 25000),
    ("NM_Albuquerque", 35.08, -106.65, 25000),
    ("UT_SaltLake", 40.76, -111.89, 25000),
    ("WI_Madison", 43.07, -89.40, 20000),
    ("WI_Milwaukee", 43.04, -87.91, 25000),
    ("LA_NewOrleans", 29.95, -90.07, 25000),
    ("SC_Charleston", 32.78, -79.93, 20000),
    ("VA_Richmond", 37.54, -77.44, 25000),
    ("MD_Baltimore", 39.29, -76.61, 25000),
    ("HI_Honolulu", 21.31, -157.86, 30000),
    ("AK_Anchorage", 61.22, -149.90, 40000),
    ("CT_NewHaven", 41.31, -72.93, 20000),
    ("RI_Providence", 41.82, -71.41, 20000),
    ("VT_Burlington", 44.48, -73.21, 20000),
    ("ME_Portland", 43.66, -70.25, 20000),
    ("NH_Portsmouth", 43.07, -70.76, 20000),
]

QUERIES = [
    "coffee roaster",
    "coffee roastery",
    "specialty coffee roaster",
    "coffee roasting company",
]


def load_dotenv(path: Path | None = None) -> None:
    candidates = []
    if path is not None:
        candidates.append(path)
    here = Path(__file__).resolve().parent
    candidates.extend([
        Path(".env"),
        here.parent / ".env",
        here.parent.parent.parent / ".env",  # monorepo root fc-landing
        Path.home() / "han" / "first-crack-proj" / "fc-desktop" / ".env",
    ])
    for p in candidates:
        if not p.exists():
            continue
        for line in p.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))
        break

def log(msg: str) -> None:
    print(msg, file=sys.stderr, flush=True)


def search_page(
    key: str,
    query: str,
    lat: float,
    lng: float,
    radius: float,
    page_token: str | None = None,
) -> dict[str, Any]:
    body: dict[str, Any] = {
        "textQuery": query,
        "languageCode": "en",
        "regionCode": "US",
        "maxResultCount": 20,
        "locationBias": {
            "circle": {
                "center": {"latitude": lat, "longitude": lng},
                "radius": float(min(radius, 50000.0)),
            }
        },
    }
    if page_token:
        body["pageToken"] = page_token
    req = urllib.request.Request(
        API,
        data=json.dumps(body).encode(),
        headers={
            "Content-Type": "application/json",
            "X-Goog-Api-Key": key,
            "X-Goog-FieldMask": FIELD_MASK,
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=40) as resp:
        return json.loads(resp.read().decode())


def normalize(place: dict[str, Any], query: str, region: str) -> dict[str, Any]:
    loc = place.get("location") or {}
    return {
        "place_id": place.get("id") or "",
        "name": (place.get("displayName") or {}).get("text") or "",
        "addr": place.get("formattedAddress") or "",
        "lat": loc.get("latitude"),
        "lng": loc.get("longitude"),
        "maps_url": place.get("googleMapsUri") or "",
        "primary_type": place.get("primaryType") or "",
        "types": ",".join(place.get("types") or []),
        "business_status": place.get("businessStatus") or "",
        "rating": place.get("rating"),
        "user_rating_count": place.get("userRatingCount"),
        "found_via_query": query,
        "found_via_region": region,
    }


def looks_like_roaster(p: dict[str, Any]) -> bool:
    name = (p.get("name") or "").lower()
    types = (p.get("types") or "").lower()
    primary = (p.get("primary_type") or "").lower()
    addr = (p.get("addr") or "").lower()
    blob = f"{name} {types} {primary}"
    # must be US-ish address when present
    if addr and "united states" not in addr and "usa" not in addr:
        # still allow if state abbreviations common in formatted addresses without country
        pass
    positive = (
        "coffee", "roast", "roaster", "roastery", "cafe", "bean", "espresso", "brew"
    )
    if any(x in blob for x in positive):
        return True
    if primary in ("cafe", "coffee_shop", "restaurant", "store"):
        return True
    return False


US_STATES = {
    "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas", "CA": "California",
    "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware", "FL": "Florida", "GA": "Georgia",
    "HI": "Hawaii", "ID": "Idaho", "IL": "Illinois", "IN": "Indiana", "IA": "Iowa",
    "KS": "Kansas", "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine", "MD": "Maryland",
    "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota", "MS": "Mississippi",
    "MO": "Missouri", "MT": "Montana", "NE": "Nebraska", "NV": "Nevada", "NH": "New Hampshire",
    "NJ": "New Jersey", "NM": "New Mexico", "NY": "New York", "NC": "North Carolina",
    "ND": "North Dakota", "OH": "Ohio", "OK": "Oklahoma", "OR": "Oregon", "PA": "Pennsylvania",
    "RI": "Rhode Island", "SC": "South Carolina", "SD": "South Dakota", "TN": "Tennessee",
    "TX": "Texas", "UT": "Utah", "VT": "Vermont", "VA": "Virginia", "WA": "Washington",
    "WV": "West Virginia", "WI": "Wisconsin", "WY": "Wyoming", "DC": "District of Columbia",
}


def state_from_addr(addr: str) -> str:
    import re
    # ", CA 90210" or ", California,"
    m = re.search(r",\s*([A-Z]{2})\s+\d{5}", addr or "")
    if m and m.group(1) in US_STATES:
        return US_STATES[m.group(1)]
    for ab, name in US_STATES.items():
        if name in (addr or ""):
            return name
    if "Washington, DC" in (addr or "") or "Washington D.C" in (addr or ""):
        return "District of Columbia"
    return "Unknown"


def main() -> int:
    load_dotenv()
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(Path(__file__).resolve().parent.parent / "data" / "raw" / "us-google-roastery"))
    ap.add_argument("--sleep", type=float, default=0.12)
    ap.add_argument("--max-pages", type=int, default=3)
    args = ap.parse_args()

    key = os.environ.get("GOOGLE_MAPS_API_KEY")
    if not key:
        log("GOOGLE_MAPS_API_KEY missing")
        return 1

    out_base = Path(args.out)
    out_base.parent.mkdir(parents=True, exist_ok=True)
    cache_path = out_base.with_suffix(".cache.jsonl")
    done_jobs: set[str] = set()
    by_id: dict[str, dict[str, Any]] = {}

    if cache_path.exists():
        with cache_path.open(encoding="utf-8") as f:
            for line in f:
                try:
                    rec = json.loads(line)
                except json.JSONDecodeError:
                    continue
                if rec.get("_job"):
                    done_jobs.add(rec["_job"])
                elif rec.get("place_id"):
                    by_id[rec["place_id"]] = rec
        log(f"resume places={len(by_id)} jobs={len(done_jobs)}")

    jobs: list[tuple[str, str, float, float, float]] = []
    for region, lat, lng, radius in REGIONS:
        for q in QUERIES:
            jobs.append((f"{region}||{q}", q, lat, lng, radius))

    api_calls = 0
    with cache_path.open("a", encoding="utf-8") as cache_f:
        for ji, (job_id, query, lat, lng, radius) in enumerate(jobs, 1):
            if job_id in done_jobs:
                continue
            page_token = None
            got = 0
            for _page in range(args.max_pages):
                try:
                    data = search_page(key, query, lat, lng, radius, page_token)
                    api_calls += 1
                except urllib.error.HTTPError as e:
                    body = e.read().decode(errors="replace")[:400]
                    log(f"HTTP {e.code} job={job_id}: {body}")
                    if e.code in (401, 403, 429):
                        log("hard stop")
                        break
                    time.sleep(2)
                    continue
                except Exception as e:
                    log(f"ERR job={job_id}: {e}")
                    time.sleep(1)
                    continue

                places = data.get("places") or []
                for pl in places:
                    rec = normalize(pl, query, job_id.split("||")[0])
                    if not rec["place_id"] or not looks_like_roaster(rec):
                        continue
                    if rec["place_id"] not in by_id:
                        by_id[rec["place_id"]] = rec
                        cache_f.write(json.dumps(rec, ensure_ascii=False) + "\n")
                        got += 1
                    else:
                        prev = by_id[rec["place_id"]]
                        if query not in (prev.get("found_via_query") or ""):
                            prev["found_via_query"] = f"{prev.get('found_via_query')};{query}"
                cache_f.flush()
                page_token = data.get("nextPageToken")
                if not page_token or not places:
                    break
                time.sleep(max(args.sleep, 0.3))
            done_jobs.add(job_id)
            cache_f.write(json.dumps({"_job": job_id}, ensure_ascii=False) + "\n")
            cache_f.flush()
            if ji % 20 == 0 or ji == len(jobs):
                log(f"[{ji}/{len(jobs)}] unique={len(by_id)} api_calls≈{api_calls} last_new={got} ({job_id})")
            time.sleep(args.sleep)

    items = sorted(
        by_id.values(),
        key=lambda x: (-(x.get("user_rating_count") or 0), x.get("name") or ""),
    )
    for it in items:
        it["state"] = state_from_addr(it.get("addr") or "")

    jsonl = out_base.with_suffix(".jsonl")
    csv_path = out_base.with_suffix(".csv")
    with jsonl.open("w", encoding="utf-8") as f:
        for it in items:
            f.write(json.dumps(it, ensure_ascii=False) + "\n")

    fields = [
        "place_id", "name", "addr", "state", "lat", "lng", "maps_url", "primary_type",
        "types", "business_status", "rating", "user_rating_count",
        "found_via_query", "found_via_region",
    ]
    with csv_path.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        w.writeheader()
        w.writerows(items)

    state_counts: dict[str, int] = {}
    for it in items:
        s = it.get("state") or "Unknown"
        state_counts[s] = state_counts.get(s, 0) + 1

    meta = {
        "total_unique": len(items),
        "api_calls_this_run_est": api_calls,
        "queries": QUERIES,
        "state_counts": dict(sorted(state_counts.items(), key=lambda x: -x[1])),
        "jsonl": str(jsonl),
        "csv": str(csv_path),
    }
    Path(str(out_base) + ".meta.json").write_text(
        json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    log(json.dumps(meta, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
