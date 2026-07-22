#!/usr/bin/env python3
"""Collect Europe coffee roasteries via Google Places searchText.

Requires GOOGLE_MAPS_API_KEY in env/.env

Usage:
  set -a && source .env && set +a
  python3 scripts/scrape-google-europe-roastery.py
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import re
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

# (country_code, label, lat, lng, radius_m)
# Cap bias radius at 50km in API call; larger values only mark intent for denser city grids.
REGIONS: list[tuple[str, str, float, float, float]] = [
    # UK / IE
    ("GB", "London", 51.5074, -0.1278, 25000),
    ("GB", "London_East", 51.54, 0.0, 15000),
    ("GB", "London_South", 51.45, -0.10, 15000),
    ("GB", "Manchester", 53.4808, -2.2426, 20000),
    ("GB", "Birmingham", 52.4862, -1.8904, 20000),
    ("GB", "Bristol", 51.4545, -2.5879, 15000),
    ("GB", "Edinburgh", 55.9533, -3.1883, 15000),
    ("GB", "Glasgow", 55.8642, -4.2518, 15000),
    ("GB", "Leeds", 53.8008, -1.5491, 15000),
    ("GB", "Liverpool", 53.4084, -2.9916, 15000),
    ("GB", "Brighton", 50.8225, -0.1372, 12000),
    ("GB", "Cambridge", 52.2053, 0.1218, 12000),
    ("GB", "Oxford", 51.7520, -1.2577, 12000),
    ("GB", "Cardiff", 51.4816, -3.1791, 15000),
    ("GB", "Belfast", 54.5973, -5.9301, 15000),
    ("IE", "Dublin", 53.3498, -6.2603, 20000),
    ("IE", "Cork", 51.8985, -8.4756, 15000),
    ("IE", "Galway", 53.2707, -9.0568, 12000),
    # Nordics
    ("SE", "Stockholm", 59.3293, 18.0686, 20000),
    ("SE", "Gothenburg", 57.7089, 11.9746, 15000),
    ("SE", "Malmo", 55.6050, 13.0038, 15000),
    ("NO", "Oslo", 59.9139, 10.7522, 20000),
    ("NO", "Bergen", 60.3913, 5.3221, 15000),
    ("DK", "Copenhagen", 55.6761, 12.5683, 20000),
    ("DK", "Aarhus", 56.1629, 10.2039, 15000),
    ("FI", "Helsinki", 60.1699, 24.9384, 20000),
    ("FI", "Tampere", 61.4978, 23.7610, 12000),
    ("IS", "Reykjavik", 64.1466, -21.9426, 15000),
    # Benelux / FR / DE / CH / AT
    ("NL", "Amsterdam", 52.3676, 4.9041, 20000),
    ("NL", "Rotterdam", 51.9244, 4.4777, 15000),
    ("NL", "Utrecht", 52.0907, 5.1214, 12000),
    ("BE", "Brussels", 50.8503, 4.3517, 18000),
    ("BE", "Antwerp", 51.2194, 4.4025, 15000),
    ("BE", "Ghent", 51.0543, 3.7174, 12000),
    ("LU", "Luxembourg", 49.6116, 6.1319, 12000),
    ("FR", "Paris", 48.8566, 2.3522, 20000),
    ("FR", "Paris_North", 48.89, 2.35, 12000),
    ("FR", "Paris_East", 48.86, 2.42, 12000),
    ("FR", "Lyon", 45.7640, 4.8357, 18000),
    ("FR", "Marseille", 43.2965, 5.3698, 18000),
    ("FR", "Bordeaux", 44.8378, -0.5792, 15000),
    ("FR", "Toulouse", 43.6047, 1.4442, 15000),
    ("FR", "Nantes", 47.2184, -1.5536, 15000),
    ("FR", "Lille", 50.6292, 3.0573, 15000),
    ("FR", "Nice", 43.7102, 7.2620, 15000),
    ("FR", "Strasbourg", 48.5734, 7.7521, 15000),
    ("DE", "Berlin", 52.5200, 13.4050, 22000),
    ("DE", "Berlin_East", 52.52, 13.48, 12000),
    ("DE", "Hamburg", 53.5511, 9.9937, 20000),
    ("DE", "Munich", 48.1351, 11.5820, 20000),
    ("DE", "Cologne", 50.9375, 6.9603, 18000),
    ("DE", "Frankfurt", 50.1109, 8.6821, 18000),
    ("DE", "Stuttgart", 48.7758, 9.1829, 15000),
    ("DE", "Dusseldorf", 51.2277, 6.7735, 15000),
    ("DE", "Leipzig", 51.3397, 12.3731, 15000),
    ("DE", "Dresden", 51.0504, 13.7373, 15000),
    ("DE", "Nuremberg", 49.4521, 11.0767, 15000),
    ("DE", "Hannover", 52.3759, 9.7320, 15000),
    ("AT", "Vienna", 48.2082, 16.3738, 20000),
    ("AT", "Graz", 47.0707, 15.4395, 15000),
    ("AT", "Salzburg", 47.8095, 13.0550, 12000),
    ("CH", "Zurich", 47.3769, 8.5417, 18000),
    ("CH", "Geneva", 46.2044, 6.1432, 15000),
    ("CH", "Basel", 47.5596, 7.5886, 12000),
    ("CH", "Bern", 46.9480, 7.4474, 12000),
    ("CH", "Lausanne", 46.5197, 6.6323, 12000),
    # Iberia / IT
    ("ES", "Madrid", 40.4168, -3.7038, 20000),
    ("ES", "Barcelona", 41.3874, 2.1686, 20000),
    ("ES", "Valencia", 39.4699, -0.3763, 18000),
    ("ES", "Seville", 37.3891, -5.9845, 15000),
    ("ES", "Bilbao", 43.2630, -2.9350, 15000),
    ("ES", "Malaga", 36.7213, -4.4214, 15000),
    ("PT", "Lisbon", 38.7223, -9.1393, 18000),
    ("PT", "Porto", 41.1579, -8.6291, 15000),
    ("IT", "Rome", 41.9028, 12.4964, 20000),
    ("IT", "Milan", 45.4642, 9.1900, 20000),
    ("IT", "Turin", 45.0703, 7.6869, 15000),
    ("IT", "Florence", 43.7696, 11.2558, 15000),
    ("IT", "Bologna", 44.4949, 11.3426, 15000),
    ("IT", "Naples", 40.8518, 14.2681, 18000),
    ("IT", "Venice", 45.4408, 12.3155, 12000),
    ("IT", "Verona", 45.4384, 10.9916, 12000),
    ("IT", "Genoa", 44.4056, 8.9463, 15000),
    ("IT", "Palermo", 38.1157, 13.3615, 15000),
    # Central / East
    ("PL", "Warsaw", 52.2297, 21.0122, 20000),
    ("PL", "Krakow", 50.0647, 19.9450, 15000),
    ("PL", "Wroclaw", 51.1079, 17.0385, 15000),
    ("PL", "Gdansk", 54.3520, 18.6466, 15000),
    ("PL", "Poznan", 52.4064, 16.9252, 15000),
    ("CZ", "Prague", 50.0755, 14.4378, 20000),
    ("CZ", "Brno", 49.1951, 16.6068, 15000),
    ("SK", "Bratislava", 48.1486, 17.1077, 15000),
    ("HU", "Budapest", 47.4979, 19.0402, 20000),
    ("RO", "Bucharest", 44.4268, 26.1025, 20000),
    ("RO", "Cluj", 46.7712, 23.6236, 15000),
    ("BG", "Sofia", 42.6977, 23.3219, 18000),
    ("HR", "Zagreb", 45.8150, 15.9819, 15000),
    ("HR", "Split", 43.5081, 16.4402, 12000),
    ("SI", "Ljubljana", 46.0569, 14.5058, 12000),
    ("RS", "Belgrade", 44.7866, 20.4489, 18000),
    ("BA", "Sarajevo", 43.8563, 18.4131, 12000),
    ("GR", "Athens", 37.9838, 23.7275, 20000),
    ("GR", "Thessaloniki", 40.6401, 22.9444, 15000),
    ("TR", "Istanbul", 41.0082, 28.9784, 22000),  # Europe-side focus
    ("TR", "Istanbul_Asia", 41.01, 29.05, 15000),
    # Baltics
    ("EE", "Tallinn", 59.4370, 24.7536, 15000),
    ("LV", "Riga", 56.9496, 24.1052, 15000),
    ("LT", "Vilnius", 54.6872, 25.2797, 15000),
    # Other
    ("UA", "Kyiv", 50.4501, 30.5234, 20000),
    ("UA", "Lviv", 49.8397, 24.0297, 15000),
    ("MD", "Chisinau", 47.0105, 28.8638, 12000),
    ("AL", "Tirana", 41.3275, 19.8187, 12000),
    ("MK", "Skopje", 41.9981, 21.4254, 12000),
    ("ME", "Podgorica", 42.4304, 19.2594, 12000),
    ("MT", "Valletta", 35.8989, 14.5146, 15000),
    ("CY", "Nicosia", 35.1856, 33.3823, 15000),
]

QUERIES = [
    "coffee roaster",
    "coffee roastery",
    "specialty coffee roaster",
    "Kaffeerösterei",       # DE/AT/CH
    "torréfaction café",    # FR
    "torrefazione caffè",   # IT
    "cafetería de especialidad tostador",  # ES soft
    "koffiebranderij",      # NL
]

# lighter query set for smaller cities to save quota — use full set always for quality


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
    region_code: str,
    page_token: str | None = None,
) -> dict[str, Any]:
    body: dict[str, Any] = {
        "textQuery": query,
        "languageCode": "en",
        "regionCode": region_code,
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


def normalize(place: dict[str, Any], query: str, region: str, country: str) -> dict[str, Any]:
    loc = place.get("location") or {}
    return {
        "place_id": place.get("id") or "",
        "country": country,
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
    blob = f"{name} {types} {primary} {p.get('name') or ''}"
    positive = (
        "coffee", "roast", "roaster", "roastery", "cafe", "café", "bean", "espresso",
        "kaffee", "rösterei", "roest", "branderij", "torref", "café", "koffie",
        "kaffe", "kahvi", "kava", "kawa", "кофе",
    )
    if any(x in blob for x in positive):
        return True
    if primary in ("cafe", "coffee_shop", "restaurant", "store", "food"):
        return True
    return False


COUNTRY_HINTS: list[tuple[str, str]] = [
    ("United Kingdom", "GB"), ("UK", "GB"), ("England", "GB"), ("Scotland", "GB"),
    ("Wales", "GB"), ("Northern Ireland", "GB"),
    ("Ireland", "IE"), ("France", "FR"), ("Germany", "DE"), ("Deutschland", "DE"),
    ("Netherlands", "NL"), ("Belgium", "BE"), ("Luxembourg", "LU"),
    ("Switzerland", "CH"), ("Austria", "AT"), ("Österreich", "AT"),
    ("Spain", "ES"), ("España", "ES"), ("Portugal", "PT"), ("Italy", "IT"),
    ("Italia", "IT"), ("Sweden", "SE"), ("Norway", "NO"), ("Denmark", "DK"),
    ("Finland", "FI"), ("Iceland", "IS"), ("Poland", "PL"), ("Czechia", "CZ"),
    ("Czech Republic", "CZ"), ("Slovakia", "SK"), ("Hungary", "HU"),
    ("Romania", "RO"), ("Bulgaria", "BG"), ("Croatia", "HR"), ("Slovenia", "SI"),
    ("Serbia", "RS"), ("Bosnia", "BA"), ("Greece", "GR"), ("Turkey", "TR"),
    ("Türkiye", "TR"), ("Estonia", "EE"), ("Latvia", "LV"), ("Lithuania", "LT"),
    ("Ukraine", "UA"), ("Moldova", "MD"), ("Albania", "AL"), ("North Macedonia", "MK"),
    ("Montenegro", "ME"), ("Malta", "MT"), ("Cyprus", "CY"),
]


def country_from_addr(addr: str, default: str) -> str:
    a = addr or ""
    for hint, code in COUNTRY_HINTS:
        if hint in a:
            return code
    # postal patterns weak fallback
    if re.search(r"\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b", a):  # UK postcode
        return "GB"
    return default


def main() -> int:
    load_dotenv()
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(Path(__file__).resolve().parent.parent / "data" / "raw" / "europe-google-roastery"))
    ap.add_argument("--sleep", type=float, default=0.12)
    ap.add_argument("--max-pages", type=int, default=2)
    ap.add_argument(
        "--queries",
        default="core",
        choices=["core", "full"],
        help="core=EN only (fewer calls); full=+local language",
    )
    args = ap.parse_args()

    key = os.environ.get("GOOGLE_MAPS_API_KEY")
    if not key:
        log("GOOGLE_MAPS_API_KEY missing")
        return 1

    queries = (
        QUERIES
        if args.queries == "full"
        else ["coffee roaster", "coffee roastery", "specialty coffee roaster"]
    )

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

    jobs: list[tuple[str, str, str, float, float, float]] = []
    for country, label, lat, lng, radius in REGIONS:
        for q in queries:
            jobs.append((f"{label}||{q}", country, q, lat, lng, radius))

    api_calls = 0
    with cache_path.open("a", encoding="utf-8") as cache_f:
        for ji, (job_id, country, query, lat, lng, radius) in enumerate(jobs, 1):
            if job_id in done_jobs:
                continue
            page_token = None
            got = 0
            for _page in range(args.max_pages):
                try:
                    data = search_page(key, query, lat, lng, radius, country, page_token)
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
                    rec = normalize(pl, query, job_id.split("||")[0], country)
                    rec["country"] = country_from_addr(rec.get("addr") or "", country)
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
                log(
                    f"[{ji}/{len(jobs)}] unique={len(by_id)} "
                    f"api_calls≈{api_calls} last_new={got} ({job_id})"
                )
            time.sleep(args.sleep)

    items = sorted(
        by_id.values(),
        key=lambda x: (
            x.get("country") or "",
            -(x.get("user_rating_count") or 0),
            x.get("name") or "",
        ),
    )

    fields = [
        "place_id", "country", "name", "addr", "lat", "lng", "maps_url", "primary_type",
        "types", "business_status", "rating", "user_rating_count",
        "found_via_query", "found_via_region",
    ]
    jsonl = out_base.with_suffix(".jsonl")
    csv_path = out_base.with_suffix(".csv")
    with jsonl.open("w", encoding="utf-8") as f:
        for it in items:
            f.write(json.dumps(it, ensure_ascii=False) + "\n")
    with csv_path.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        w.writeheader()
        w.writerows(items)

    country_counts: dict[str, int] = {}
    for it in items:
        c = it.get("country") or "Unknown"
        country_counts[c] = country_counts.get(c, 0) + 1

    meta = {
        "total_unique": len(items),
        "api_calls_this_run_est": api_calls,
        "queries": queries,
        "country_counts": dict(sorted(country_counts.items(), key=lambda x: -x[1])),
        "csv": str(csv_path),
        "jsonl": str(jsonl),
    }
    Path(str(out_base) + ".meta.json").write_text(
        json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    log(json.dumps(meta, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
