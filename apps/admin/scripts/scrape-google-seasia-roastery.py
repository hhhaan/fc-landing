#!/usr/bin/env python3
"""Collect Southeast Asia coffee roasteries via Google Places searchText.

Markets: SG, MY, TH, VN, ID, PH, KH, LA, MM, BN

Requires GOOGLE_MAPS_API_KEY.

Usage (apps/admin):
  python3 scripts/scrape-google-seasia-roastery.py
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

# (country_code, label, lat, lng, radius_m)
REGIONS: list[tuple[str, str, float, float, float]] = [
    # Singapore
    ("SG", "Singapore_Central", 1.3000, 103.8500, 12000),
    ("SG", "Singapore_East", 1.3200, 103.9300, 10000),
    ("SG", "Singapore_West", 1.3400, 103.7400, 10000),
    ("SG", "Singapore_North", 1.4300, 103.7900, 10000),
    # Malaysia
    ("MY", "KualaLumpur", 3.1390, 101.6869, 20000),
    ("MY", "PetalingJaya", 3.1073, 101.6067, 12000),
    ("MY", "Penang", 5.4141, 100.3288, 15000),
    ("MY", "JohorBahru", 1.4927, 103.7414, 15000),
    ("MY", "Ipoh", 4.5975, 101.0901, 12000),
    ("MY", "KotaKinabalu", 5.9804, 116.0735, 12000),
    ("MY", "Kuching", 1.5533, 110.3592, 12000),
    ("MY", "Malacca", 2.1896, 102.2501, 12000),
    # Thailand
    ("TH", "Bangkok_Sukhumvit", 13.7367, 100.5610, 15000),
    ("TH", "Bangkok_Silom", 13.7240, 100.5300, 12000),
    ("TH", "Bangkok_Ari", 13.7800, 100.5400, 10000),
    ("TH", "ChiangMai", 18.7883, 98.9853, 18000),
    ("TH", "ChiangRai", 19.9105, 99.8406, 12000),
    ("TH", "Phuket", 7.8804, 98.3923, 15000),
    ("TH", "Pattaya", 12.9236, 100.8825, 12000),
    ("TH", "HuaHin", 12.5684, 99.9577, 12000),
    # Vietnam
    ("VN", "HoChiMinh_D1", 10.7769, 106.7009, 15000),
    ("VN", "HoChiMinh_D3", 10.7820, 106.6870, 10000),
    ("VN", "Hanoi_HoanKiem", 21.0285, 105.8542, 15000),
    ("VN", "Hanoi_TayHo", 21.0700, 105.8200, 10000),
    ("VN", "DaNang", 16.0544, 108.2022, 15000),
    ("VN", "HoiAn", 15.8801, 108.3380, 10000),
    ("VN", "DaLat", 11.9404, 108.4583, 12000),
    ("VN", "Hue", 16.4637, 107.5909, 10000),
    # Indonesia
    ("ID", "Jakarta_Central", -6.2088, 106.8456, 18000),
    ("ID", "Jakarta_South", -6.2600, 106.8100, 12000),
    ("ID", "Bandung", -6.9175, 107.6191, 15000),
    ("ID", "Surabaya", -7.2575, 112.7521, 15000),
    ("ID", "Yogyakarta", -7.7956, 110.3695, 12000),
    ("ID", "Bali_Denpasar", -8.6705, 115.2126, 15000),
    ("ID", "Bali_Canggu", -8.6478, 115.1385, 10000),
    ("ID", "Bali_Ubud", -8.5069, 115.2625, 10000),
    ("ID", "Medan", 3.5952, 98.6722, 12000),
    ("ID", "Makassar", -5.1477, 119.4327, 12000),
    # Philippines
    ("PH", "Manila_Makati", 14.5547, 121.0244, 15000),
    ("PH", "Manila_BGC", 14.5515, 121.0470, 10000),
    ("PH", "Manila_QC", 14.6760, 121.0437, 12000),
    ("PH", "Cebu", 10.3157, 123.8854, 15000),
    ("PH", "Davao", 7.1907, 125.4553, 12000),
    ("PH", "Tagaytay", 14.1153, 120.9621, 10000),
    # Cambodia / Laos / Myanmar / Brunei
    ("KH", "PhnomPenh", 11.5564, 104.9282, 15000),
    ("KH", "SiemReap", 13.3633, 103.8560, 12000),
    ("LA", "Vientiane", 17.9757, 102.6331, 12000),
    ("LA", "LuangPrabang", 19.8850, 102.1350, 10000),
    ("MM", "Yangon", 16.8661, 96.1951, 15000),
    ("MM", "Mandalay", 21.9588, 96.0891, 12000),
    ("BN", "BandarSeriBegawan", 4.9031, 114.9398, 12000),
]

QUERIES_CORE = [
    "coffee roaster",
    "coffee roastery",
    "specialty coffee roaster",
]

# light local-language queries for denser markets
QUERIES_LOCAL: dict[str, list[str]] = {
    "TH": ["คั่วกาแฟ", "ร้านคั่วกาแฟ"],
    "VN": ["rang xay cà phê", "xưởng rang cà phê"],
    "ID": ["roastery kopi", "sangrai kopi"],
    "MY": ["kedai kopi roaster"],
    "PH": ["kape roaster"],
}


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
    language: str,
    page_token: str | None = None,
) -> dict[str, Any]:
    body: dict[str, Any] = {
        "textQuery": query,
        "languageCode": language,
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
        "coffee",
        "roast",
        "roaster",
        "roastery",
        "cafe",
        "café",
        "bean",
        "espresso",
        "kopi",
        "kape",
        "กาแฟ",
        "cà phê",
        "caphe",
        "咖啡",
    )
    if any(x in blob for x in positive):
        return True
    return primary in ("cafe", "coffee_shop", "restaurant", "store", "food")


COUNTRY_HINTS = [
    ("Singapore", "SG"),
    ("Malaysia", "MY"),
    ("Thailand", "TH"),
    ("Vietnam", "VN"),
    ("Viet Nam", "VN"),
    ("Indonesia", "ID"),
    ("Philippines", "PH"),
    ("Cambodia", "KH"),
    ("Laos", "LA"),
    ("Myanmar", "MM"),
    ("Burma", "MM"),
    ("Brunei", "BN"),
]


def country_from_addr(addr: str, default: str) -> str:
    a = addr or ""
    for hint, code in COUNTRY_HINTS:
        if hint in a:
            return code
    return default


def lang_for(country: str, query: str) -> str:
    if any(ord(c) > 127 for c in query):
        return {
            "TH": "th",
            "VN": "vi",
            "ID": "id",
            "MY": "ms",
            "PH": "en",
        }.get(country, "en")
    return "en"


def main() -> int:
    load_dotenv()
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--out",
        default=str(
            Path(__file__).resolve().parent.parent / "data" / "raw" / "seasia-google-roastery"
        ),
    )
    ap.add_argument("--sleep", type=float, default=0.12)
    ap.add_argument("--max-pages", type=int, default=2)
    ap.add_argument("--with-local", action="store_true", help="add local-language queries")
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

    jobs: list[tuple[str, str, str, float, float, float]] = []
    for country, label, lat, lng, radius in REGIONS:
        qs = list(QUERIES_CORE)
        if args.with_local:
            qs.extend(QUERIES_LOCAL.get(country, []))
        for q in qs:
            jobs.append((f"{label}||{q}", country, q, lat, lng, radius))

    api_calls = 0
    with cache_path.open("a", encoding="utf-8") as cache_f:
        for ji, (job_id, country, query, lat, lng, radius) in enumerate(jobs, 1):
            if job_id in done_jobs:
                continue
            page_token = None
            got = 0
            language = lang_for(country, query)
            for _page in range(args.max_pages):
                try:
                    data = search_page(
                        key, query, lat, lng, radius, country, language, page_token
                    )
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
