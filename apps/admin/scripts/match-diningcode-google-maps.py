#!/usr/bin/env python3
"""Match DiningCode roasteries against Google Places (searchText).

Requires GOOGLE_MAPS_API_KEY in env or .env

Usage:
  set -a && source .env && set +a
  python3 scripts/match-diningcode-google-maps.py
  python3 scripts/match-diningcode-google-maps.py --limit 50   # dry sample
"""

from __future__ import annotations

import argparse
import csv
import json
import math
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
    "places.id,places.displayName,places.formattedAddress,"
    "places.location,places.googleMapsUri"
)
# Text Search Pro free cap ~5k/mo — stay under with single call per POI
DEFAULT_SLEEP = 0.12


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


def haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def norm_name(s: str) -> str:
    s = (s or "").lower()
    s = re.sub(r"[^\w가-힣]+", "", s, flags=re.UNICODE)
    for w in ("커피", "카페", "로스터리", "로스터스", "coffee", "cafe", "roastery", "roasters"):
        s = s.replace(w, "")
    return s


def name_score(a: str, b: str) -> float:
    na, nb = norm_name(a), norm_name(b)
    if not na or not nb:
        return 0.0
    if na == nb:
        return 1.0
    if na in nb or nb in na:
        return 0.85
    # token overlap (char bigrams)
    def grams(x: str) -> set[str]:
        if len(x) < 2:
            return {x}
        return {x[i : i + 2] for i in range(len(x) - 1)}

    ga, gb = grams(na), grams(nb)
    inter = len(ga & gb)
    union = len(ga | gb) or 1
    return inter / union


def search_text(
    key: str,
    query: str,
    lat: float | None,
    lng: float | None,
    radius: float = 800.0,
) -> list[dict[str, Any]]:
    body: dict[str, Any] = {
        "textQuery": query,
        "languageCode": "ko",
        "maxResultCount": 5,
        "regionCode": "KR",
    }
    if lat is not None and lng is not None:
        body["locationBias"] = {
            "circle": {
                "center": {"latitude": float(lat), "longitude": float(lng)},
                "radius": radius,
            }
        }
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
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode())
    return data.get("places") or []


def classify(row: dict[str, Any], places: list[dict[str, Any]]) -> dict[str, Any]:
    name = row.get("name") or ""
    lat, lng = row.get("lat"), row.get("lng")
    best = None
    best_score = -1.0
    best_dist = None
    best_ns = 0.0

    for p in places:
        pn = (p.get("displayName") or {}).get("text") or ""
        loc = p.get("location") or {}
        plat, plng = loc.get("latitude"), loc.get("longitude")
        ns = name_score(name, pn)
        dist = None
        if lat is not None and lng is not None and plat is not None and plng is not None:
            dist = haversine_m(float(lat), float(lng), float(plat), float(plng))
        # composite
        score = ns
        if dist is not None:
            if dist <= 80:
                score += 0.25
            elif dist <= 200:
                score += 0.15
            elif dist <= 500:
                score += 0.05
            elif dist > 1500:
                score -= 0.4
        if score > best_score:
            best_score = score
            best = p
            best_dist = dist
            best_ns = ns

    if not best:
        status = "not_found"
    elif best_ns >= 0.55 and (best_dist is None or best_dist <= 500):
        status = "matched"
    elif best_ns >= 0.4 and (best_dist is not None and best_dist <= 200):
        status = "matched"
    elif best_ns >= 0.35 or (best_dist is not None and best_dist <= 100):
        status = "maybe"
    else:
        status = "not_found"

    out = {
        "v_rid": row.get("v_rid"),
        "name": name,
        "addr": row.get("road_addr") or row.get("addr") or "",
        "lat": lat,
        "lng": lng,
        "dc_score": row.get("score"),
        "status": status,
        "g_place_id": (best or {}).get("id") or "",
        "g_name": ((best or {}).get("displayName") or {}).get("text") or "",
        "g_addr": (best or {}).get("formattedAddress") or "",
        "g_maps_url": (best or {}).get("googleMapsUri") or "",
        "g_lat": ((best or {}).get("location") or {}).get("latitude"),
        "g_lng": ((best or {}).get("location") or {}).get("longitude"),
        "name_sim": round(best_ns, 3) if best else 0,
        "dist_m": round(best_dist, 1) if best_dist is not None else "",
        "match_score": round(best_score, 3) if best else 0,
    }
    return out


def main() -> int:
    load_dotenv()
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", default=str(Path(__file__).resolve().parent.parent / "data" / "raw" / "diningcode-roastery.jsonl"))
    ap.add_argument("--out", default=str(Path(__file__).resolve().parent.parent / "data" / "raw" / "diningcode-google-match"))
    ap.add_argument("--sleep", type=float, default=DEFAULT_SLEEP)
    ap.add_argument("--limit", type=int, default=0, help="0 = all")
    ap.add_argument("--resume", action="store_true", default=True)
    ap.add_argument("--no-resume", action="store_false", dest="resume")
    args = ap.parse_args()

    key = os.environ.get("GOOGLE_MAPS_API_KEY") or os.environ.get("GOOGLE_PLACES_API_KEY")
    if not key:
        log("GOOGLE_MAPS_API_KEY missing")
        return 1

    rows: list[dict[str, Any]] = []
    with open(args.input, encoding="utf-8") as f:
        for line in f:
            rows.append(json.loads(line))
    if args.limit:
        rows = rows[: args.limit]

    out_base = Path(args.out)
    out_base.parent.mkdir(parents=True, exist_ok=True)
    jsonl_path = out_base.with_suffix(".jsonl")
    csv_path = out_base.with_suffix(".csv")
    cache_path = out_base.with_suffix(".cache.jsonl")

    done: dict[str, dict[str, Any]] = {}
    if args.resume and cache_path.exists():
        with cache_path.open(encoding="utf-8") as f:
            for line in f:
                try:
                    r = json.loads(line)
                    done[r["v_rid"]] = r
                except json.JSONDecodeError:
                    pass
        log(f"resume: {len(done)} cached")

    results: list[dict[str, Any]] = []
    errors = 0
    with cache_path.open("a", encoding="utf-8") as cache_f:
        for i, row in enumerate(rows, 1):
            rid = row.get("v_rid") or ""
            if rid in done:
                results.append(done[rid])
                continue

            name = row.get("name") or ""
            addr = row.get("road_addr") or row.get("addr") or ""
            # Prefer name + area; full address can confuse search
            area = (row.get("area") or "").split(",")[0]
            query = " ".join(x for x in (name, area, "카페") if x).strip()
            if addr:
                # short street snippet
                query = f"{name} {addr[:40]}"

            try:
                places = search_text(key, query, row.get("lat"), row.get("lng"))
                rec = classify(row, places)
            except urllib.error.HTTPError as e:
                body = e.read().decode(errors="replace")[:300]
                log(f"HTTP {e.code} {name}: {body}")
                rec = {
                    "v_rid": rid,
                    "name": name,
                    "addr": addr,
                    "lat": row.get("lat"),
                    "lng": row.get("lng"),
                    "dc_score": row.get("score"),
                    "status": "error",
                    "g_place_id": "",
                    "g_name": "",
                    "g_addr": "",
                    "g_maps_url": "",
                    "g_lat": None,
                    "g_lng": None,
                    "name_sim": 0,
                    "dist_m": "",
                    "match_score": 0,
                    "error": f"HTTP {e.code}",
                }
                errors += 1
                if e.code in (401, 403):
                    log("auth/quota hard fail — stop")
                    cache_f.write(json.dumps(rec, ensure_ascii=False) + "\n")
                    cache_f.flush()
                    results.append(rec)
                    break
            except Exception as e:
                log(f"ERR {name}: {e}")
                rec = {
                    "v_rid": rid,
                    "name": name,
                    "addr": addr,
                    "lat": row.get("lat"),
                    "lng": row.get("lng"),
                    "dc_score": row.get("score"),
                    "status": "error",
                    "g_place_id": "",
                    "g_name": "",
                    "g_addr": "",
                    "g_maps_url": "",
                    "g_lat": None,
                    "g_lng": None,
                    "name_sim": 0,
                    "dist_m": "",
                    "match_score": 0,
                    "error": str(e),
                }
                errors += 1

            cache_f.write(json.dumps(rec, ensure_ascii=False) + "\n")
            cache_f.flush()
            results.append(rec)
            if i % 50 == 0 or i == len(rows):
                counts = {}
                for r in results:
                    counts[r["status"]] = counts.get(r["status"], 0) + 1
                log(f"[{i}/{len(rows)}] {counts}")
            time.sleep(args.sleep)

    # write outputs
    with jsonl_path.open("w", encoding="utf-8") as f:
        for r in results:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")

    fields = [
        "v_rid", "name", "addr", "lat", "lng", "dc_score", "status",
        "g_place_id", "g_name", "g_addr", "g_maps_url", "g_lat", "g_lng",
        "name_sim", "dist_m", "match_score",
    ]
    with csv_path.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        w.writeheader()
        w.writerows(results)

    # not_found only
    not_found = [r for r in results if r["status"] in ("not_found", "maybe")]
    nf_path = Path(str(out_base) + "-unregistered.csv")
    with nf_path.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        w.writeheader()
        w.writerows(not_found)

    counts: dict[str, int] = {}
    for r in results:
        counts[r["status"]] = counts.get(r["status"], 0) + 1
    summary = {
        "total": len(results),
        "counts": counts,
        "errors": errors,
        "jsonl": str(jsonl_path),
        "csv": str(csv_path),
        "unregistered_csv": str(nf_path),
    }
    Path(str(out_base) + ".meta.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    log(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0 if errors == 0 or counts.get("matched", 0) > 0 else 2


if __name__ == "__main__":
    raise SystemExit(main())
