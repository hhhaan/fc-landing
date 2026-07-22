#!/usr/bin/env python3
"""Collect Japan coffee roasteries via Google Places searchText.

Requires GOOGLE_MAPS_API_KEY in env/.env

Usage:
  set -a && source .env && set +a
  python3 scripts/scrape-google-japan-roastery.py
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

# Pref name, lat, lng (approx center)
PREFECTURES: list[tuple[str, float, float, float]] = [
    # name, lat, lng, radius_m
    ("北海道", 43.06, 141.35, 120000),
    ("青森県", 40.82, 140.74, 70000),
    ("岩手県", 39.70, 141.15, 70000),
    ("宮城県", 38.27, 140.87, 60000),
    ("秋田県", 39.72, 140.10, 70000),
    ("山形県", 38.24, 140.36, 60000),
    ("福島県", 37.75, 140.47, 70000),
    ("茨城県", 36.34, 140.45, 60000),
    ("栃木県", 36.57, 139.88, 60000),
    ("群馬県", 36.39, 139.06, 60000),
    ("埼玉県", 35.86, 139.65, 50000),
    ("千葉県", 35.60, 140.12, 60000),
    ("東京都", 35.68, 139.76, 50000),
    ("神奈川県", 35.45, 139.64, 50000),
    ("新潟県", 37.90, 139.02, 90000),
    ("富山県", 36.70, 137.21, 50000),
    ("石川県", 36.59, 136.63, 50000),
    ("福井県", 36.07, 136.22, 50000),
    ("山梨県", 35.66, 138.57, 50000),
    ("長野県", 36.65, 138.18, 80000),
    ("岐阜県", 35.39, 136.72, 70000),
    ("静岡県", 34.98, 138.38, 70000),
    ("愛知県", 35.18, 136.91, 60000),
    ("三重県", 34.73, 136.51, 60000),
    ("滋賀県", 35.00, 135.87, 50000),
    ("京都府", 35.02, 135.76, 50000),
    ("大阪府", 34.69, 135.50, 50000),
    ("兵庫県", 34.69, 135.18, 70000),
    ("奈良県", 34.69, 135.83, 45000),
    ("和歌山県", 34.23, 135.17, 60000),
    ("鳥取県", 35.50, 134.24, 50000),
    ("島根県", 35.47, 133.05, 70000),
    ("岡山県", 34.66, 133.93, 60000),
    ("広島県", 34.40, 132.46, 70000),
    ("山口県", 34.19, 131.47, 70000),
    ("徳島県", 34.07, 134.56, 50000),
    ("香川県", 34.34, 134.04, 45000),
    ("愛媛県", 33.84, 132.77, 70000),
    ("高知県", 33.56, 133.53, 70000),
    ("福岡県", 33.61, 130.42, 60000),
    ("佐賀県", 33.25, 130.30, 45000),
    ("長崎県", 32.75, 129.87, 70000),
    ("熊本県", 32.79, 130.74, 70000),
    ("大分県", 33.24, 131.61, 60000),
    ("宮崎県", 31.91, 131.42, 70000),
    ("鹿児島県", 31.56, 130.56, 90000),
    ("沖縄県", 26.21, 127.68, 90000),
]

# Major metro sub-centers to reduce Tokyo/Osaka under-coverage
EXTRA_CENTERS: list[tuple[str, float, float, float]] = [
    ("東京都_渋谷", 35.66, 139.70, 12000),
    ("東京都_新宿", 35.69, 139.70, 12000),
    ("東京都_池袋", 35.73, 139.71, 12000),
    ("東京都_下北沢", 35.66, 139.67, 10000),
    ("東京都_清澄白河", 35.68, 139.80, 10000),
    ("東京都_吉祥寺", 35.70, 139.58, 10000),
    ("大阪府_梅田", 34.70, 135.50, 12000),
    ("大阪府_難波", 34.67, 135.50, 12000),
    ("大阪府_天王寺", 34.65, 135.51, 10000),
    ("神奈川県_横浜", 35.44, 139.64, 15000),
    ("愛知県_名古屋", 35.17, 136.91, 15000),
    ("福岡県_福岡市", 33.59, 130.40, 15000),
    ("北海道_札幌", 43.06, 141.35, 20000),
    ("宮城県_仙台", 38.27, 140.87, 15000),
    ("広島県_広島市", 34.39, 132.46, 15000),
]

QUERIES = [
    "コーヒーロースター",
    "自家焙煎コーヒー",
    "coffee roaster",
    "珈琲焙煎",
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
        "languageCode": "ja",
        "regionCode": "JP",
        "maxResultCount": 20,
        "locationBias": {
            "circle": {
                "center": {"latitude": lat, "longitude": lng},
                "radius": float(min(radius, 50000.0)),  # API max bias often 50km
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
    """Soft filter: keep coffee-related; drop obvious noise."""
    name = (p.get("name") or "").lower()
    types = (p.get("types") or "").lower()
    primary = (p.get("primary_type") or "").lower()
    blob = f"{name} {types} {primary}"
    positive = (
        "coffee", "roast", "roaster", "cafe", "珈琲", "コーヒー", "焙煎",
        "ロースター", "カフェ", "bean",
    )
    if any(x in blob for x in positive):
        return True
    # keep if primary is cafe/food
    if primary in ("cafe", "coffee_shop", "restaurant"):
        return True
    return False


def main() -> int:
    load_dotenv()
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(Path(__file__).resolve().parent.parent / "data" / "raw" / "japan-google-roastery"))
    ap.add_argument("--sleep", type=float, default=0.15)
    ap.add_argument("--max-pages", type=int, default=3, help="pages per query×region")
    ap.add_argument("--no-extra", action="store_true", help="skip metro sub-centers")
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

    regions = list(PREFECTURES)
    if not args.no_extra:
        regions.extend(EXTRA_CENTERS)

    jobs: list[tuple[str, str, float, float, float]] = []
    for region, lat, lng, radius in regions:
        for q in QUERIES:
            jobs.append((f"{region}||{q}", q, lat, lng, radius))

    api_calls = 0
    with cache_path.open("a", encoding="utf-8") as cache_f:
        for ji, (job_id, query, lat, lng, radius) in enumerate(jobs, 1):
            if job_id in done_jobs:
                continue
            page_token = None
            got = 0
            for page in range(args.max_pages):
                try:
                    data = search_page(key, query, lat, lng, radius, page_token)
                    api_calls += 1
                except urllib.error.HTTPError as e:
                    body = e.read().decode(errors="replace")[:400]
                    log(f"HTTP {e.code} job={job_id}: {body}")
                    if e.code in (401, 403, 429):
                        log("hard stop")
                        # still mark partial
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
                    if not rec["place_id"]:
                        continue
                    if not looks_like_roaster(rec):
                        continue
                    if rec["place_id"] not in by_id:
                        by_id[rec["place_id"]] = rec
                        cache_f.write(json.dumps(rec, ensure_ascii=False) + "\n")
                        got += 1
                    else:
                        # merge found_via
                        prev = by_id[rec["place_id"]]
                        if query not in (prev.get("found_via_query") or ""):
                            prev["found_via_query"] = f"{prev.get('found_via_query')};{query}"
                cache_f.flush()
                page_token = data.get("nextPageToken")
                if not page_token or not places:
                    break
                time.sleep(max(args.sleep, 0.3))  # token warm-up
            done_jobs.add(job_id)
            cache_f.write(json.dumps({"_job": job_id}, ensure_ascii=False) + "\n")
            cache_f.flush()
            if ji % 10 == 0 or ji == len(jobs):
                log(f"[{ji}/{len(jobs)}] unique={len(by_id)} api_calls≈{api_calls} last_new={got} ({job_id})")
            time.sleep(args.sleep)

    items = sorted(by_id.values(), key=lambda x: (-(x.get("user_rating_count") or 0), x.get("name") or ""))
    jsonl = out_base.with_suffix(".jsonl")
    csv_path = out_base.with_suffix(".csv")
    with jsonl.open("w", encoding="utf-8") as f:
        for it in items:
            f.write(json.dumps(it, ensure_ascii=False) + "\n")

    fields = [
        "place_id", "name", "addr", "lat", "lng", "maps_url", "primary_type",
        "types", "business_status", "rating", "user_rating_count",
        "found_via_query", "found_via_region",
    ]
    with csv_path.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        w.writeheader()
        w.writerows(items)

    # by prefecture rough count from address
    pref_counts: dict[str, int] = {}
    for it in items:
        addr = it.get("addr") or ""
        hit = "不明"
        for pref, *_ in PREFECTURES:
            if pref in addr:
                hit = pref
                break
        pref_counts[hit] = pref_counts.get(hit, 0) + 1

    meta = {
        "total_unique": len(items),
        "api_calls_this_run_est": api_calls,
        "queries": QUERIES,
        "prefecture_counts": dict(sorted(pref_counts.items(), key=lambda x: -x[1])),
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
