---
title: Cafe24 연동
description: Mall ID와 Access token으로 Cafe24 주문을 First Crack에 연결
---

Cafe24는 개발자 센터 앱의 **OAuth Access token**과 **Mall ID**로 Admin API를 호출합니다.

## 준비물

- Cafe24 쇼핑몰 운영자 계정
- [Cafe24 Developers](https://developers.cafe24.com/) 앱
- **Mall ID** (예: `yourmall` → `yourmall.cafe24.com`)
- **Access token** (`mall.read_order` 스코프 포함)

공식 참고:

- [Admin API 개요](https://developers.cafe24.com/docs/en/api/)
- [OAuth 인증](https://developers.cafe24.com/en/app/front/app/develop/oauth/)

## 1. 개발자 앱 · 토큰

1. [Cafe24 Developers](https://developers.cafe24.com/)에서 앱을 생성합니다.
2. Redirect URI 등 OAuth 설정을 앱 안내에 맞게 구성합니다.
3. 쇼핑몰 관리자 계정으로 앱을 설치·동의합니다.
4. 발급된 **access_token**을 복사합니다.
5. 주문 조회에 **`mall.read_order`** 스코프가 포함되어 있는지 확인합니다.

:::tip[토큰 갱신]
Access token은 만료됩니다. **refresh_token** + 앱 Client ID/Secret을 First Crack에 함께 저장하는 방식은 이후 버전에서 확장될 수 있습니다. 현재는 **유효한 access token**을 연결 UI에 입력합니다. 만료 시 재발급 후 채널을 다시 연결하세요.
:::

## 2. Mall ID 확인

- 관리자 URL이 `https://yourmall.cafe24.com/admin/...` 형태면 Mall ID는 **`yourmall`**
- 개발자 콘솔·스토어 설정에서도 동일 ID를 확인할 수 있습니다.

## 3. First Crack에서 연결

1. 앱 → **주문** → **채널**
2. **Cafe24 연결**
3. 입력:
   - **Mall ID**
   - **Access token**
   - (선택) 표시 이름
4. **연결**

서버가 `GET /api/v2/admin/store`로 스토어 정보를 조회해 검증합니다.

## 4. 동기화

- **지금 동기화**로 즉시 수집
- 조회 API: `GET /api/v2/admin/orders`
- 기간: `start_date` + `end_date` (함께 사용, 공식 스펙)
- 품목: `embed=items,buyer` 로 라인 정보 포함

## 5. 상품 연결

Cafe24 **상품번호(`product_no`)** 또는 **상품코드(`product_code`)** 를 First Crack `sku`와 맞춥니다.  
→ [상품 SKU 매핑](/orders/sku-mapping/)

## 상태 매핑 (참고)

Cafe24 주문 속성 (공식 property list 기준):

| 필드 | 값 | First Crack |
|------|-----|-------------|
| `canceled` | T | cancelled |
| `paid` | F | pending |
| `paid` | T / M | paid (배송 전) |
| `shipping_status` | F | 배송 대기 → paid/preparing |
| `shipping_status` | M | shipped (배송 중) |
| `shipping_status` | T | delivered |
| `shipping_status` | W / X | preparing |
| `process_status` | prepare / prepareproduct / hold | preparing |

## 공식 문서

- [Admin API — Orders](https://developers.cafe24.com/docs/en/api/) (Retrieve a list of orders)
- Scope: **mall.read_order**

## 문제 해결

| 증상 | 확인 |
|------|------|
| 401 / invalid token | 토큰 만료·오타, 앱 설치 몰 일치 여부 |
| 403 / scope | `mall.read_order` 동의 여부 |
| 주문 0건 | start/end 기간, 테스트 주문 날짜, shop_no(멀티샵) |
| Mall ID 오류 | 서브도메인만 입력 (`https://` 제외) |

문의 시 **Mall ID·대략 시각**만 공유하고, access token은 보내지 마세요. → [문의하기](/support/contact/)
