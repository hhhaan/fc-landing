#!/usr/bin/env python3
"""Collect Australia (+ NZ metros) coffee roasteries via Google Places searchText.

Requires GOOGLE_MAPS_API_KEY.

Usage (apps/admin):
  python3 scripts/scrape-google-australia-roastery.py
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
REGIONS: list[tuple[str, str, float, float, float]] = [
    # Australia major metros
    ("AU", "Sydney", -33.8688, 151.2093, 25000),
    ("AU", "Sydney_InnerWest", -33.90, 151.15, 12000),
    ("AU", "Sydney_North", -33.80, 151.20, 12000),
    ("AU", "Melbourne", -37.8136, 144.9631, 25000),
    ("AU", "Melbourne_Fitzroy", -37.80, 144.98, 12000),
    ("AU", "Melbourne_South", -37.85, 144.98, 12000),
    ("AU", "Brisbane", -27.4698, 153.0251, 22000),
    ("AU", "GoldCoast", -28.0167, 153.4000, 18000),
    ("AU", "Perth", -31.9505, 115.8605, 22000),
    ("AU", "Adelaide", -34.9285, 138.6007, 20000),
    ("AU", "Canberra", -35.2809, 149.1300, 15000),
    ("AU", "Hobart", -42.8821, 147.3272, 15000),
    ("AU", "Darwin", -12.4634, 130.8456, 15000),
    ("AU", "Newcastle", -32.9283, 151.7817, 15000),
    ("AU", "Wollongong", -34.4278, 150.8931, 12000),
    ("AU", "Geelong", -38.1499, 144.3617, 12000),
    ("AU", "Cairns", -16.9186, 145.7781, 15000),
    ("AU", "Townsville", -19.2590, 146.8169, 12000),
    ("AU", "ByronBay", -28.6474, 153.6020, 12000),
    ("AU", "Ballarat", -37.5622, 143.8503, 12000),
    ("AU", "Bendigo", -36.7570, 144.2794, 12000),
    ("AU", "Launceston", -41.4332, 147.1441, 12000),
    ("AU", "SunshineCoast", -26.6500, 153.0667, 15000),
    ("AU", "Fremantle", -32.0569, 115.7439, 12000),
    # New Zealand (often grouped with AU market ops)
    ("NZ", "Auckland", -36.8485, 174.7633, 22000),
    ("NZ", "Wellington", -41.2865, 174.7762, 15000),
    ("NZ", "Christchurch", -43.5321, 172.6362, 15000),
    ("NZ", "Queenstown", -45.0312, 168.6626, 12000),
    ("NZ", "Dunedin", -45.8788, 170.5028, 12000),
    ("NZ", "Hamilton", -37.7870, 175.2793, 12000),
]

QUERIES_CORE = [
    "coffee roaster",
    "coffee roastery",
    "specialty coffee roaster",
]


def load_dotenv(path: Path | None = None) -> None:
    candidates = []
    if path is not None:
        candidates.append(path)
    here = Path(__file__).resolve().parent
    candidates.extend(
        [
            Path(".env"),
            here.parent / ".env",
            here.parent.parent.parent / ".env",
            Path("/Users/hanseungheon/han/first-crack-proj/fc-desktop/.env"),
        ]
    )
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
    blob = f"{name} {types} {primary}"
    positive = ("coffee", "roast", "roaster", "roastery", "cafe", "bean", "espresso", "brew")
    if any(x in blob for x in positive):
        return True
    return primary in ("cafe", "coffee_shop", "restaurant", "store", "food")


def country_from_addr(addr: str, default: str) -> str:
    a = addr or ""
    if "New Zealand" in a or "NZ" in a:
        return "NZ"
    if "Australia" in a or re.search(r"\bAUS\b", a):
        return "AU"
    if re.search(r"\b(NSW|VIC|QLD|WA|SA|TAS|ACT|NT)\b", a):
        return "AU"
    return default


def main() -> int:
    load_dotenv()
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--out",
        default=str(
            Path(__file__).resolve().parent.parent / "data" / "raw" / "australia-google-roastery"
        ),
    )
    ap.add_argument("--sleep", type=float, default=0.12)
    ap.add_argument("--max-pages", type=int, default=2)
    args = ap.parse_args()

    key = os.environ.get("GOOGLE_MAPS_API_KEY")
    if not key:
        log("GOOGLE_MAPS_API_KEY missing")
        return 1

    queries = QUERIES_CORE
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
            if ji % 15 == 0 or ji == len(jobs):
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
        "place_id",
        "country",
        "name",
        "addr",
        "lat",
        "lng",
        "maps_url",
        "primary_type",
        "types",
        "business_status",
        "rating",
        "user_rating_count",
        "found_via_query",
        "found_via_region",
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
