#!/usr/bin/env python3
"""Collect nationwide 로스터리카페 POIs from DiningCode isearch API.

Ranking list is hard-capped at 100 per query. This script recursively
splits by 시·도 → 시·군·구 until total_cnt <= 100, then pages (size=20).

Usage:
  python3 scripts/scrape-diningcode-roastery.py
  python3 scripts/scrape-diningcode-roastery.py --keyword 로스터리카페 --out data/diningcode-roastery
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

API_URL = "https://im.diningcode.com/API/isearch/"
PAGE_SIZE = 20
HARD_CAP = 100
DEFAULT_SLEEP = 0.2

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Content-Type": "application/x-www-form-urlencoded",
    "Origin": "https://www.diningcode.com",
    "Referer": "https://www.diningcode.com/",
}

# 시·도 → 시·군·구 (DiningCode query 파싱에 맞게 짧게)
REGIONS: dict[str, list[str]] = {
    "서울": [
        "강남구", "강동구", "강북구", "강서구", "관악구", "광진구", "구로구", "금천구",
        "노원구", "도봉구", "동대문구", "동작구", "마포구", "서대문구", "서초구", "성동구",
        "성북구", "송파구", "양천구", "영등포구", "용산구", "은평구", "종로구", "중구", "중랑구",
    ],
    "부산": [
        "중구", "서구", "동구", "영도구", "부산진구", "동래구", "남구", "북구", "해운대구",
        "사하구", "금정구", "강서구", "연제구", "수영구", "사상구", "기장군",
    ],
    "대구": [
        "중구", "동구", "서구", "남구", "북구", "수성구", "달서구", "달성군", "군위군",
    ],
    "인천": [
        "중구", "동구", "미추홀구", "연수구", "남동구", "부평구", "계양구", "서구",
        "강화군", "옹진군",
    ],
    "광주": ["동구", "서구", "남구", "북구", "광산구"],
    "대전": ["동구", "중구", "서구", "유성구", "대덕구"],
    "울산": ["중구", "남구", "동구", "북구", "울주군"],
    "세종": ["세종"],
    "경기": [
        "수원", "성남", "용인", "고양", "화성", "부천", "남양주", "안산", "안양", "평택",
        "시흥", "김포", "의정부", "광명", "하남", "군포", "오산", "이천", "안성", "의왕",
        "양주", "구리", "포천", "동두천", "가평", "양평", "여주", "연천", "과천", "광주",
        "파주",
    ],
    "강원": [
        "춘천", "원주", "강릉", "동해", "태백", "속초", "삼척", "홍천", "횡성", "영월",
        "평창", "정선", "철원", "화천", "양구", "인제", "고성", "양양",
    ],
    "충북": [
        "청주", "충주", "제천", "보은", "옥천", "영동", "증평", "진천", "괴산", "음성", "단양",
    ],
    "충남": [
        "천안", "공주", "보령", "아산", "서산", "논산", "계룡", "당진", "금산", "부여",
        "서천", "청양", "홍성", "예산", "태안",
    ],
    "전북": [
        "전주", "군산", "익산", "정읍", "남원", "김제", "완주", "진안", "무주", "장수",
        "임실", "순창", "고창", "부안",
    ],
    "전남": [
        "목포", "여수", "순천", "나주", "광양", "담양", "곡성", "구례", "고흥", "보성",
        "화순", "장흥", "강진", "해남", "영암", "무안", "함평", "영광", "장성", "완도",
        "진도", "신안",
    ],
    "경북": [
        "포항", "경주", "김천", "안동", "구미", "영주", "영천", "상주", "문경", "경산",
        "의성", "청송", "영양", "영덕", "청도", "고령", "성주", "칠곡", "예천", "봉화",
        "울진", "울릉",
    ],
    "경남": [
        "창원", "진주", "통영", "사천", "김해", "밀양", "거제", "양산", "의령", "함안",
        "창녕", "고성", "남해", "하동", "산청", "함양", "거창", "합천",
    ],
    "제주": ["제주시", "서귀포시"],
}

# 구 단위에서도 total==100 일 때 쓸 동/권역 힌트 (마포 등)
DISTRICT_SUB: dict[str, list[str]] = {
    "서울 마포구": [
        "합정", "상수", "연남", "망원", "공덕", "성산", "서교", "신수", "대흥", "아현",
        "도화", "염리", "용강", "중동", "상암", "성산동", "서교동",
    ],
}


def log(msg: str) -> None:
    print(msg, file=sys.stderr, flush=True)


def post_isearch(query: str, page: int, size: int = PAGE_SIZE, retries: int = 4) -> dict[str, Any]:
    payload = {
        "mode": "poi",
        "query": query,
        "search_type": "ranking_search",
        "order": "r_score",
        "dc_flag": "1",
        "size": str(size),
        "page": str(page),
    }
    data = urllib.parse.urlencode(payload).encode()
    last_err: Exception | None = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(API_URL, data=data, headers=HEADERS, method="POST")
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode())
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as e:
            last_err = e
            time.sleep(0.5 * (2**attempt))
    raise RuntimeError(f"isearch failed for {query!r} page={page}: {last_err}")


def poi_section(resp: dict[str, Any]) -> dict[str, Any]:
    return resp.get("result_data", {}).get("poi_section") or {}


def normalize_item(raw: dict[str, Any]) -> dict[str, Any]:
    rid = raw.get("v_rid") or ""
    cat = raw.get("category") or ""
    if isinstance(cat, str):
        cat = cat.replace("<em>", "").replace("</em>", "")
    area = raw.get("area") or []
    if isinstance(area, list):
        area_s = ",".join(str(a) for a in area)
    else:
        area_s = str(area)
    return {
        "v_rid": rid,
        "name": raw.get("nm") or "",
        "branch": raw.get("branch") or "",
        "addr": raw.get("addr") or "",
        "road_addr": raw.get("road_addr") or "",
        "phone": raw.get("phone") or "",
        "lat": raw.get("lat"),
        "lng": raw.get("lng"),
        "score": raw.get("score"),
        "user_score": raw.get("user_score"),
        "review_cnt": raw.get("review_cnt"),
        "category": cat,
        "area": area_s,
        "open_status": raw.get("open_status") or "",
        "image": raw.get("image") or "",
        "profile_url": f"https://www.diningcode.com/profile.php?rid={rid}" if rid else "",
    }


def fetch_query_all(
    query: str,
    sleep_s: float,
    *,
    page_only_probe: bool = False,
) -> tuple[int | None, list[dict[str, Any]]]:
    """Fetch pages for a query (hard cap 100 unique). Returns (total_cnt, items)."""
    first = post_isearch(query, page=1)
    time.sleep(sleep_s)
    sec = poi_section(first)
    total = sec.get("total_cnt")
    items: list[dict[str, Any]] = []
    seen: set[str] = set()

    def absorb(lst: list[dict[str, Any]]) -> int:
        n = 0
        for raw in lst:
            item = normalize_item(raw)
            rid = item["v_rid"]
            if not rid or rid in seen:
                continue
            seen.add(rid)
            items.append(item)
            n += 1
        return n

    absorb(sec.get("list") or [])
    if total is None:
        return None, items

    # When over hard cap, only probe page 1 (caller splits region)
    if page_only_probe or int(total) > HARD_CAP:
        return int(total), items

    max_pages = min(HARD_CAP // PAGE_SIZE, (int(total) + PAGE_SIZE - 1) // PAGE_SIZE)
    for page in range(2, max_pages + 1):
        resp = post_isearch(query, page=page)
        time.sleep(sleep_s)
        lst = poi_section(resp).get("list") or []
        new = absorb(lst)
        if new == 0:
            break
    return int(total), items

def children_for(region_path: str, keyword: str) -> list[str]:
    """Return child query strings for further split."""
    # exact district sub
    if region_path in DISTRICT_SUB:
        return [f"{region_path} {sub} {keyword}".strip() for sub in DISTRICT_SUB[region_path]]

    parts = region_path.split()
    if not region_path:
        # top: 17 sido
        return [f"{sido} {keyword}".strip() for sido in REGIONS]

    if len(parts) == 1 and parts[0] in REGIONS:
        sido = parts[0]
        kids = REGIONS[sido]
        # 세종 is leaf
        if sido == "세종":
            return []
        out = []
        for child in kids:
            # avoid duplicate city names in query noise
            if child == sido:
                out.append(f"{sido} {keyword}".strip())
            else:
                out.append(f"{sido} {child} {keyword}".strip())
        # unique preserve order
        seen: set[str] = set()
        uniq = []
        for q in out:
            if q not in seen:
                seen.add(q)
                uniq.append(q)
        return uniq

    # already at 시군구 — no automatic children except DISTRICT_SUB
    return []


def collect(keyword: str, sleep_s: float) -> tuple[dict[str, dict[str, Any]], list[tuple[str, int | None, int]]]:
    """BFS region split. Returns (by_rid, stats)."""
    by_rid: dict[str, dict[str, Any]] = {}
    stats: list[tuple[str, int | None, int]] = []
    queue: list[str] = [keyword]  # start national
    visited_q: set[str] = set()

    while queue:
        q = queue.pop(0)
        if q in visited_q:
            continue
        visited_q.add(q)

        # Probe page 1 first for total_cnt
        total, probe = fetch_query_all(q, sleep_s, page_only_probe=True)
        region_path = q.replace(keyword, "").strip()

        if total is not None and total > HARD_CAP:
            kids = children_for(region_path, keyword)
            if kids:
                log(f"SPLIT {q!r} total={total} → {len(kids)} children")
                for kid in kids:
                    if kid not in visited_q:
                        queue.append(kid)
                stats.append((q, total, 0))
                continue
            log(f"WARN  {q!r} total={total} > {HARD_CAP} but no children; fetch up to {HARD_CAP}")
            # re-fetch full cap pages
            total, items = fetch_query_all(q, sleep_s, page_only_probe=False)
            # force paging even when total>cap
            if len(items) <= PAGE_SIZE and total and total > PAGE_SIZE:
                items = []
                seen: set[str] = set()
                for page in range(1, HARD_CAP // PAGE_SIZE + 1):
                    resp = post_isearch(q, page=page)
                    time.sleep(sleep_s)
                    new = 0
                    for raw in poi_section(resp).get("list") or []:
                        it = normalize_item(raw)
                        rid = it["v_rid"]
                        if not rid or rid in seen:
                            continue
                        seen.add(rid)
                        items.append(it)
                        new += 1
                    if new == 0:
                        break
        else:
            # total <= 100: full page fetch
            total, items = fetch_query_all(q, sleep_s, page_only_probe=False)
            # if probe already had items and second call works fine
            if not items and probe:
                items = probe

        for it in items:
            by_rid.setdefault(it["v_rid"], it)
        stats.append((q, total, len(items)))
        log(f"OK    {q!r} total={total} got={len(items)} unique_all={len(by_rid)}")

        # if total == HARD_CAP exactly, try sub-split if available
        if total == HARD_CAP:
            kids = children_for(region_path, keyword)
            if kids:
                log(f"EDGE  {q!r} total=={HARD_CAP}, also enqueue {len(kids)} subs")
                for kid in kids:
                    if kid not in visited_q:
                        queue.append(kid)
    return by_rid, stats


def write_outputs(items: list[dict[str, Any]], out_base: Path) -> None:
    out_base.parent.mkdir(parents=True, exist_ok=True)
    jsonl = out_base.with_suffix(".jsonl")
    csv_path = out_base.with_suffix(".csv")
    meta = out_base.with_suffix(".meta.json")

    with jsonl.open("w", encoding="utf-8") as f:
        for it in items:
            f.write(json.dumps(it, ensure_ascii=False) + "\n")

    fields = [
        "v_rid", "name", "branch", "addr", "road_addr", "phone", "lat", "lng",
        "score", "user_score", "review_cnt", "category", "area", "open_status",
        "image", "profile_url",
    ]
    with csv_path.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        w.writeheader()
        w.writerows(items)

    meta.write_text(
        json.dumps({"count": len(items), "jsonl": str(jsonl), "csv": str(csv_path)}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    log(f"wrote {jsonl} ({len(items)} rows)")
    log(f"wrote {csv_path}")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--keyword", default="로스터리카페")
    ap.add_argument("--out", default=str(Path(__file__).resolve().parent.parent / "data" / "raw" / "diningcode-roastery"))
    ap.add_argument("--sleep", type=float, default=DEFAULT_SLEEP)
    args = ap.parse_args()

    by_rid, stats = collect(args.keyword, args.sleep)
    items = sorted(by_rid.values(), key=lambda x: (-(x.get("score") or 0), x.get("name") or ""))
    write_outputs(items, Path(args.out))

    # national total check
    nat_total, _ = fetch_query_all(args.keyword, args.sleep)
    log(f"national total_cnt={nat_total} collected_unique={len(items)}")
    if nat_total and abs(len(items) - nat_total) > max(50, nat_total * 0.05):
        log(f"WARN coverage gap: collected {len(items)} vs claimed {nat_total}")
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
