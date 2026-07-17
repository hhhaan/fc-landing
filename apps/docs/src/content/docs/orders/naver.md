---
title: 네이버 스마트스토어 연동
description: 커머스API Client ID·Secret으로 네이버 주문을 First Crack에 연결
---

네이버는 **웹훅이 없어** First Crack이 일정 주기로 변경된 주문을 조회합니다.  
인증은 커머스API **Client Credentials + 전자서명** 방식입니다. (공식: [커머스API 인증](https://apicenter.commerce.naver.com/docs/auth))

## 준비물

- 네이버 스마트스토어 판매자 계정
- [네이버 커머스API 센터](https://apicenter.commerce.naver.com/) 접근 권한
- **내 스토어(SELF)** 용 애플리케이션의 **Client ID**, **Client Secret**

## 1. 커머스API 애플리케이션 발급

1. [커머스API 센터](https://apicenter.commerce.naver.com/)에 로그인합니다.
2. 스마트스토어(또는 연동할 판매 채널)에 **애플리케이션**을 등록합니다.
3. 발급된 값을 복사합니다.
   - **Client ID** (애플리케이션 ID)
   - **Client Secret** (애플리케이션 시크릿 — `$2a$…` 형태의 값)
4. 토큰 타입은 **SELF**(자기 스토어 리소스)를 사용합니다. First Crack 연결 시 서버가 `type=SELF`로 토큰을 발급합니다.

:::caution[시크릿 보관]
Client Secret은 비밀번호와 같습니다. 메신저·스크린샷·공개 저장소에 올리지 마세요. First Crack에 붙여 넣으면 **서버 전용 저장소**에만 보관됩니다.
:::

## 2. First Crack에서 연결

1. 앱 → **주문** → **채널**
2. **네이버 스마트스토어 연결** 클릭
3. 입력:
   - **Client ID**
   - **Client Secret**
   - (선택) 표시 이름 — 예: `본점 스마트스토어`
4. **연결** 클릭

연결 시 서버가 실제 토큰 발급·주문 조회 API를 호출해 검증합니다. 실패하면 키·권한·스토어 상태를 확인하세요.

## 3. 주문 동기화

- **지금 동기화**: 해당 채널(또는 전체 채널) 즉시 수집
- 자동 동기화: 서버 스케줄이 설정된 환경에서는 주기적으로 변경 주문을 가져옵니다

수집 범위(요약):

- 변경 상품 주문 조회 → 상품주문번호 목록
- 상세 조회(한 번에 최대 300건) 후 First Crack 주문으로 저장

## 4. 상품 연결

주문 라인의 채널 상품번호·판매자 상품코드와 **First Crack 상품 SKU**를 맞춥니다.  
자세한 방법: [상품 SKU 매핑](/orders/sku-mapping/)

권장:

- 스마트스토어 **판매자 상품 코드**(`sellerProductCode`) = First Crack `products.sku`
- 또는 채널 상품 번호 / 옵션 코드를 SKU로 등록

## 상태 매핑 (참고)

| 네이버 `productOrderStatus` (공식) | First Crack |
|-----------------------------------|-------------|
| PAYMENT_WAITING | 결제 대기 (pending) |
| PAYED | 결제 완료 (paid) |
| DELIVERING | 배송 중 (shipped) |
| DELIVERED / PURCHASE_DECIDED | 배송·구매 확정 (delivered) |
| CANCELED / CANCELED_BY_NOPAYMENT | 취소 |
| RETURNED | 환불·반품 (refunded) |

클레임이 `CANCEL_DONE` / `RETURN_DONE` 등이면 취소·환불로 우선 반영됩니다.

## 공식 문서

- [인증](https://apicenter.commerce.naver.com/docs/auth)
- [변경 상품 주문 내역 조회](https://apicenter.commerce.naver.com/docs/commerce-api/current/seller-get-last-changed-status-pay-order-seller)
- [상품 주문 상세 내역 조회](https://apicenter.commerce.naver.com/docs/commerce-api/current/seller-get-product-orders-pay-order-seller)

## 문제 해결

| 증상 | 확인 |
|------|------|
| 연결 실패 · token 오류 | Client ID/Secret 오타, 시크릿이 bcrypt salt 형식인지, SELF 앱인지 |
| 주문 0건 | 최근 변경 주문이 있는지, 결제 완료 이후 상태인지, 동기화 시각 |
| 401 GW.AUTHN | 토큰 만료 — 다음 동기화 시 자동 재발급. 반복되면 Secret 재발급 |

계속 실패하면 [문의하기](/support/contact/)에 **표시 이름·대략 시각·에러 문구**를 알려 주세요. (Secret 값은 보내지 마세요.)
