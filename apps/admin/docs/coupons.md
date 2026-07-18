# Polar 쿠폰 구조

단일 사용(1회) 할인 코드를 **fc-admin**에서 생성·보관·배포하고, 사용자가 **구독 체크아웃**에서 직접 입력한다.  
checkout 서버 연동 없음. 할인 적용·1회 제한은 **Polar**가 담당한다.

## 역할 분담

| 주체 | 담당 |
|------|------|
| **fc-admin** | 코드 생성, idle 풀, Issue(배포 마킹), 목록·비활성, 사용 여부 추적 |
| **Polar** | discount 객체, 금액/기간, `max_redemptions=1`, 체크아웃 코드 입력 검증 |
| **운영자** | Issue된 코드를 사용자에게 수동 전달 (메일/슬랙/DM 등) |
| **사용자** | 구독 체크아웃에서 코드 입력 |

Polar에는 사용자당 1회·랜덤 코드 생성·customer 바인딩이 없다.  
그래서 **코드당 전역 1회**(`max_redemptions: 1`) + **admin 풀 관리** 조합을 쓴다.

## 상태 머신

```
idle ──Issue──► issued ──결제 성공──► redeemed
  │                │
  └─Disable────────┴─Disable──► disabled
```

| status | 의미 |
|--------|------|
| `idle` | 생성됨. 아직 누구에게도 안 줌 |
| `issued` | 배포함. 코드 전달 완료 (또는 전달 직전 풀에서 꺼냄) |
| `redeemed` | Polar `redemptions_count >= 1` (체크아웃에서 사용됨) |
| `disabled` | 폐기. Polar discount 삭제 시도 후 DB 마킹 |

- **Create batch:** N개 생성 → 전부 `idle`
- **Issue next:** 가장 오래된 `idle` 1건 → `issued` (+ 코드 클립보드 복사)
- **Issue (row):** 특정 `idle` 1건 배포
- **Disable:** `idle` / `issued`만 가능. `redeemed`는 불가
- **Redeemed 동기화:** list 조회 시 `issued` 코드에 대해 Polar GET → `redemptions_count` 반영

## 운영 플로우

```
1. Coupons 페이지에서 배치 생성
   (할인율/고정액, duration, count 1–50, name/note)

2. DB polar_coupons + Polar discounts 각각 N개
   status = idle

3. Issue next (또는 행 Issue)
   status = issued → 코드 복사 → 사용자에게 전달

4. 사용자 구독 체크아웃에서 코드 입력
   Polar: 1회만 적용 (max_redemptions=1)

5. Admin list 새로고침
   issued → redeemed (동기화)
```

코드는 **직접 전달**한다. 앱이 자동으로 붙이지 않는다.

## 데이터

### 테이블 `public.polar_coupons`

Migration: `fc-desktop/supabase/migrations/20260716000000_polar_coupons.sql`  
( shared product DB. service_role only — client RLS policy 없음 )

| 컬럼 | 설명 |
|------|------|
| `code` | Polar 체크아웃 입력 코드 (unique) |
| `polar_discount_id` | Polar discount UUID (unique) |
| `name` | 표시/배치 라벨 |
| `type` | `percentage` \| `fixed` |
| `basis_points` | % 할인 (2000 = 20%) |
| `amount_cents` | 고정액 (USD cents) |
| `duration` | `once` \| `forever` \| `repeating` |
| `duration_in_months` | repeating일 때 |
| `max_redemptions` | 항상 1 (1회용) |
| `redemptions_count` | Polar 동기화 캐시 |
| `status` | idle / issued / redeemed / disabled |
| `batch_id` | 같은 생성 배치 공유 UUID |
| `note` | 운영 메모 |
| `issued_at` / `redeemed_at` / `disabled_at` | 타임스탬프 |

v1에 **user_id 할당 없음**. idle 풀에 쌓아 두고 순차 배포.

### Polar discount 생성 파라미터

- `code`: admin이 랜덤 생성 (alphanumeric, ~12자)
- `max_redemptions: 1`
- `duration`: once (기본 권장 — 첫 청구 1회 할인) / forever / repeating
- type: percentage (`basis_points`) 또는 fixed (`amounts`)
- `products`: 생성 시 **product scope** 선택
  - `monthly` (기본): Pro/Pro+ 월간 × US/KR/JP — 연간 체크아웃 불가
  - `yearly`: Pro/Pro+ 연간 × US/KR/JP — 월간 체크아웃 불가
  - `all`: `products` 미설정 — 전 상품 적용

## 코드 위치 (fc-landing monorepo)

| 경로 | 역할 |
|------|------|
| `apps/admin/app/(dashboard)/coupons/` | 라우트 |
| `apps/admin/fsd-pages/coupons/ui/CouponsPage.tsx` | UI |
| `apps/admin/app/api/coupons/` | BFF list/create |
| `apps/admin/app/api/coupons/issue/` | Issue |
| `apps/admin/app/api/coupons/[id]/` | Disable |
| `apps/admin/shared/api/coupons/` | types, server, api, queries |
| `apps/admin/shared/lib/polar/discounts.ts` | Polar HTTP client |
| `apps/admin/shared/lib/polar/productScope.ts` | monthly / yearly / all → product UUID 목록 |
| `polar_coupons.product_scope` | DB 기록 (default `monthly`) |

## 환경 변수

| Var | 위치 |
|-----|------|
| `POLAR_ACCESS_TOKEN` | admin server only (Vercel Production / `.env.local`) |
| Supabase service role | 기존 admin env |

`NEXT_PUBLIC_` 에 Polar 토큰 넣지 말 것.

## UI

- 라우트: `/coupons`
- KPI: idle / issued / redeemed / disabled
- Create batch 폼 + Pool 테이블
- **직각 UI** (rounded 없음). Create / Issue next 버튼 포함

## 범위 밖 (의도적)

- fc-desktop checkout에 `discount_id` 자동 적용
- webhook으로 redeemed 즉시 마킹 (list 동기화로 충분)
- 사용자 FK / 캠페인 공용 코드(높은 max_redemptions)
- Polar 대시보드 벌크 랜덤 생성 (없음 → admin이 생성)

## 검증 체크리스트

1. migration 적용 (`polar_coupons` 존재)
2. `POLAR_ACCESS_TOKEN` 설정
3. batch create → Polar dashboard에 discount N개 + admin idle N
4. Issue next → 코드 전달 → 체크아웃 입력 → 할인 적용
5. 같은 코드 재사용 실패
6. list에서 redeemed 반영
7. Disable → 코드 사용 불가
