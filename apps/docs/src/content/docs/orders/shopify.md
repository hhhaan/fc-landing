---
title: Shopify 연동
description: custom app Admin API 토큰으로 Shopify 주문을 First Crack에 연결
---

Shopify는 스토어에 **커스텀 앱**을 만들고 발급된 **Admin API access token**을 First Crack에 붙여 넣는 방식입니다.

## 준비물

- Shopify 스토어 관리자 권한
- 샵 도메인 (예: `mystore.myshopify.com`)
- Admin API access token

공식 참고: [Admin API access tokens (custom apps)](https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/generate-app-access-tokens-admin)

## 1. Shopify에서 앱 만들기

1. Shopify 관리자 → **설정** → **앱 및 판매 채널** → **앱 개발** (Develop apps)
2. **앱 만들기** → 이름 예: `First Crack`
3. **Admin API 통합 구성**에서 스코프를 켭니다.

### 필수 스코프

| 스코프 | 용도 |
|--------|------|
| `read_orders` | 주문 목록·상세 조회 |
| `read_products` | 상품·SKU 목록 (매핑 보조) |

선택:

| 스코프 | 용도 |
|--------|------|
| `read_all_orders` | **60일보다 오래된** 주문 조회 (필요 시 요청) |
| `write_orders` | 향후 발송(운송장) 역연동 시 |

4. **앱 설치** 후 한 번만 표시되는 **Admin API access token**을 복사해 안전한 곳에 보관합니다.

:::caution[토큰은 한 번만 표시]
토큰을 분실하면 앱을 재설치하거나 토큰을 다시 발급해야 합니다. First Crack 외 곳에 평문으로 남기지 마세요.
:::

## 2. First Crack에서 연결

1. 앱 → **주문** → **채널**
2. **Shopify 연결**
3. 입력:
   - **Shop domain** — `mystore` 또는 `mystore.myshopify.com`
   - **Admin API access token**
   - (선택) 표시 이름
4. **연결**

서버가 GraphQL `shop { name }` 조회로 토큰을 검증합니다.

## 3. 동기화

- **지금 동기화**로 즉시 수집
- 기본 조회 필터: 최근 업데이트된 주문 (`updated_at` 기준)
- 기본 스코프만 있으면 Shopify 정책상 **최근 약 60일** 주문이 중심입니다. 더 오래된 이력이 필요하면 `read_all_orders`를 요청하세요.

## 4. 상품 연결

Shopify variant **SKU**를 First Crack 상품 `sku`와 동일하게 두면 주문 라인이 자동 매핑됩니다.  
→ [상품 SKU 매핑](/orders/sku-mapping/)

## 상태 매핑 (참고)

| Shopify (표시용 상태) | First Crack |
|----------------------|-------------|
| financial: pending / authorized | pending |
| financial: paid + 미출고 | paid |
| fulfillment: partial / on_hold 등 | preparing |
| fulfillment: fulfilled / shipped | shipped |
| financial: refunded / voided | refunded |
| cancelledAt 있음 | cancelled |

## 공식 문서

- [Orders GraphQL query](https://shopify.dev/docs/api/admin-graphql/latest/queries/orders)
- [Order object](https://shopify.dev/docs/api/admin-graphql/latest/objects/Order)
- [Access scopes](https://shopify.dev/docs/api/usage/access-scopes)

## 문제 해결

| 증상 | 확인 |
|------|------|
| Unauthorized / 401 | 토큰 복사 누락·공백, 앱 설치 여부 |
| Access denied on orders | `read_orders` 스코프·앱 재설치 |
| 주문이 일부만 보임 | 60일 제한 → `read_all_orders` |
| shop 도메인 오류 | `.myshopify.com` 포함 여부, 커스텀 도메인 대신 myshopify 도메인 사용 |

문의 시 **스토어 도메인·대략 시각**만 공유하고, access token은 보내지 마세요. → [문의하기](/support/contact/)
