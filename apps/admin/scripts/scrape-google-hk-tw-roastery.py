#!/usr/bin/env python3
"""Collect Hong Kong & Taiwan coffee roasteries via Google Places searchText.

Requires GOOGLE_MAPS_API_KEY in env/.env

Usage:
  set -a && source .env && set +a
  python3 scripts/scrape-google-hk-tw-roastery.py
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

# (region_code, label, lat, lng, radius_m)
REGIONS: list[tuple[str, str, float, float, float]] = [
    # Hong Kong
    ("HK", "HK_Central", 22.2819, 114.1580, 8000),
    ("HK", "HK_SheungWan", 22.2865, 114.1500, 6000),
    ("HK", "HK_WanChai", 22.2770, 114.1730, 6000),
    ("HK", "HK_CausewayBay", 22.2800, 114.1850, 6000),
    ("HK", "HK_TsimShaTsui", 22.2988, 114.1722, 7000),
    ("HK", "HK_MongKok", 22.3193, 114.1694, 6000),
    ("HK", "HK_YauMaTei", 22.3120, 114.1700, 5000),
    ("HK", "HK_ShamShuiPo", 22.3307, 114.1622, 6000),
    ("HK", "HK_KwunTong", 22.3120, 114.2260, 7000),
    ("HK", "HK_SaiKung", 22.3830, 114.2700, 10000),
    ("HK", "HK_ShaTin", 22.3830, 114.1880, 8000),
    ("HK", "HK_TaiPo", 22.4500, 114.1700, 8000),
    ("HK", "HK_TuenMun", 22.3910, 113.9770, 8000),
    ("HK", "HK_YuenLong", 22.4450, 114.0220, 8000),
    ("HK", "HK_IslandEast", 22.2840, 114.2160, 7000),
    ("HK", "HK_Aberdeen", 22.2480, 114.1550, 6000),
    # Taiwan
    ("TW", "TW_Taipei_Zhongzheng", 25.0320, 121.5200, 8000),
    ("TW", "TW_Taipei_DaAn", 25.0260, 121.5430, 7000),
    ("TW", "TW_Taipei_Zhongshan", 25.0680, 121.5250, 7000),
    ("TW", "TW_Taipei_Songshan", 25.0500, 121.5650, 7000),
    ("TW", "TW_Taipei_Wanhua", 25.0370, 121.5000, 6000),
    ("TW", "TW_Taipei_Xinyi", 25.0330, 121.5650, 6000),
    ("TW", "TW_NewTaipei_Banqiao", 25.0140, 121.4630, 8000),
    ("TW", "TW_NewTaipei_Yonghe", 25.0080, 121.5150, 6000),
    ("TW", "TW_NewTaipei_Tamsui", 25.1680, 121.4460, 8000),
    ("TW", "TW_Keelung", 25.1280, 121.7420, 10000),
    ("TW", "TW_Taoyuan", 24.9930, 121.3010, 12000),
    ("TW", "TW_Hsinchu", 24.8040, 120.9710, 12000),
    ("TW", "TW_Taichung_West", 24.1470, 120.6730, 10000),
    ("TW", "TW_Taichung_North", 24.1650, 120.6850, 8000),
    ("TW", "TW_Taichung_Nantun", 24.1400, 120.6400, 8000),
    ("TW", "TW_Changhua", 24.0800, 120.5400, 12000),
    ("TW", "TW_Chiayi", 23.4800, 120.4500, 12000),
    ("TW", "TW_Tainan_WestCentral", 22.9900, 120.2000, 10000),
    ("TW", "TW_Tainan_East", 22.9900, 120.2300, 8000),
    ("TW", "TW_Kaohsiung_Cianjin", 22.6300, 120.3000, 10000),
    ("TW", "TW_Kaohsiung_Zuoying", 22.6900, 120.3000, 10000),
    ("TW", "TW_Kaohsiung_Gushan", 22.6300, 120.2800, 8000),
    ("TW", "TW_Pingtung", 22.6800, 120.4900, 15000),
    ("TW", "TW_Yilan", 24.7500, 121.7500, 15000),
    ("TW", "TW_Hualien", 23.9900, 121.6000, 15000),
    ("TW", "TW_Taitung", 22.7600, 121.1500, 15000),
    ("TW", "TW_Nantou", 23.9000, 120.6800, 15000),
    ("TW", "TW_Miaoli", 24.5600, 120.8200, 15000),
    ("TW", "TW_Yunlin", 23.7100, 120.4300, 15000),
    ("TW", "TW_Penghu", 23.5700, 119.5800, 20000),
]

QUERIES_BY_REGION: dict[str, list[str]] = {
    "HK": [
        "coffee roaster",
        "coffee roastery",
        "specialty coffee roaster",
        "咖啡烘焙",
        "咖啡烘焙室",
    ],
    "TW": [
        "咖啡烘焙",
        "咖啡烘焙坊",
        "咖啡烘焙工作室",
        "coffee roaster",
        "coffee roastery",
        "specialty coffee roaster",
    ],
}


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


def normalize(place: dict[str, Any], query: str, region: str, market: str) -> dict[str, Any]:
    loc = place.get("location") or {}
    return {
        "place_id": place.get("id") or "",
        "market": market,
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
        "coffee", "roast", "roaster", "roastery", "cafe", "bean", "espresso",
        "咖啡", "烘焙", "珈琲", "咖啡廳", "咖啡店",
    )
    if any(x in blob for x in positive):
        return True
    if primary in ("cafe", "coffee_shop", "restaurant", "store"):
        return True
    return False


def addr_market(addr: str, default: str) -> str:
    a = addr or ""
    if any(x in a for x in ("Hong Kong", "香港", "Kowloon", "New Territories", "HK")):
        return "HK"
    if any(x in a for x in ("Taiwan", "台灣", "台湾", "Taipei", "台北", "高雄", "台中", "台南", "新北")):
        return "TW"
    return default


def main() -> int:
    load_dotenv()
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(Path(__file__).resolve().parent.parent / "data" / "raw" / "hk-tw-google-roastery"))
    ap.add_argument("--sleep", type=float, default=0.12)
    ap.add_argument("--max-pages", type=int, default=3)
    ap.add_argument("--only", choices=["HK", "TW", "all"], default="all")
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

    regions = [r for r in REGIONS if args.only == "all" or r[0] == args.only]
    jobs: list[tuple[str, str, str, float, float, float]] = []
    for market, label, lat, lng, radius in regions:
        for q in QUERIES_BY_REGION[market]:
            jobs.append((f"{label}||{q}", market, q, lat, lng, radius))

    api_calls = 0
    with cache_path.open("a", encoding="utf-8") as cache_f:
        for ji, (job_id, market, query, lat, lng, radius) in enumerate(jobs, 1):
            if job_id in done_jobs:
                continue
            lang = "zh-TW" if market == "TW" else "zh-HK"
            # mix: English queries work better with en for some
            if any(ord(c) < 128 for c in query) and " " in query:
                lang = "en"
            page_token = None
            got = 0
            for _page in range(args.max_pages):
                try:
                    data = search_page(
                        key, query, lat, lng, radius, market, lang, page_token
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
                    rec = normalize(pl, query, job_id.split("||")[0], market)
                    rec["market"] = addr_market(rec.get("addr") or "", market)
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
                log(f"[{ji}/{len(jobs)}] unique={len(by_id)} api_calls≈{api_calls} last_new={got} ({job_id})")
            time.sleep(args.sleep)

    items = sorted(
        by_id.values(),
        key=lambda x: (
            x.get("market") or "",
            -(x.get("user_rating_count") or 0),
            x.get("name") or "",
        ),
    )

    fields = [
        "place_id", "market", "name", "addr", "lat", "lng", "maps_url", "primary_type",
        "types", "business_status", "rating", "user_rating_count",
        "found_via_query", "found_via_region",
    ]

    # combined
    jsonl = out_base.with_suffix(".jsonl")
    csv_path = out_base.with_suffix(".csv")
    with jsonl.open("w", encoding="utf-8") as f:
        for it in items:
            f.write(json.dumps(it, ensure_ascii=False) + "\n")
    with csv_path.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        w.writeheader()
        w.writerows(items)

    # split HK / TW
    for market, suffix in (("HK", "hk"), ("TW", "tw")):
        subset = [x for x in items if x.get("market") == market]
        p = Path(__file__).resolve().parent.parent / "data" / "raw" / f"{suffix}-google-roastery"
        with p.with_suffix(".jsonl").open("w", encoding="utf-8") as f:
            for it in subset:
                f.write(json.dumps(it, ensure_ascii=False) + "\n")
        with p.with_suffix(".csv").open("w", encoding="utf-8", newline="") as f:
            w = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
            w.writeheader()
            w.writerows(subset)

    market_counts = {}
    for it in items:
        m = it.get("market") or "Unknown"
        market_counts[m] = market_counts.get(m, 0) + 1

    meta = {
        "total_unique": len(items),
        "market_counts": market_counts,
        "api_calls_this_run_est": api_calls,
        "combined_csv": str(csv_path),
        "hk_csv": str(Path(__file__).resolve().parent.parent / "data" / "raw" / "hk-google-roastery.csv"),
        "tw_csv": str(Path(__file__).resolve().parent.parent / "data" / "raw" / "tw-google-roastery.csv"),
    }
    Path(str(out_base) + ".meta.json").write_text(
        json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    log(json.dumps(meta, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
