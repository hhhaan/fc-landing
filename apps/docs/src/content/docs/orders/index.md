---
title: 쇼핑몰 주문 연동
description: 네이버 스마트스토어, Cafe24, Shopify 주문을 First Crack에 가져와 로스팅 필요량·재고와 연결합니다
---

First Crack은 **외부 쇼핑몰 주문을 수집**해 로스팅 필요량을 계산하고, 완제품 재고 출고와 연결합니다.  
플랫폼 API 키는 **서버에만 저장**되며, 데스크톱 앱에 다시 노출되지 않습니다.

:::note[요금제]
주문·채널 연동은 **Enterprise(또는 플랜 안내에 따른 주문 연동 가능 플랜)** 에서 사용할 수 있습니다. 잠금 화면이 보이면 설정 → 결제에서 플랜을 확인하세요.
:::

## 지원 채널

| 채널 | 연결 방식 | 수집 방식 |
|------|-----------|-----------|
| [네이버 스마트스토어](/orders/naver/) | Client ID + Client Secret | 주기적 폴링 (웹훅 없음) |
| [Shopify](/orders/shopify/) | 샵 도메인 + Admin API access token | 폴링 (+ 추후 웹훅) |
| [Cafe24](/orders/cafe24/) | Mall ID + Access token | 폴링 (+ 추후 웹훅) |

## 전체 흐름

1. First Crack 앱 → **주문** → **채널** 탭
2. 플랫폼 선택 후 API 자격증명 입력 → **연결** (서버가 실제 API로 검증)
3. **지금 동기화** 또는 자동 동기화로 주문 수집
4. [상품 SKU 매핑](/orders/sku-mapping/) 후 로스팅 필요량·출고 사용

```
쇼핑몰 주문 발생
    ↓
동기화 (order-sync)
    ↓
orders / order_lines 저장
    ↓
products.sku 와 매칭 → 로스팅 필요량 카드
    ↓
출고 처리 → 완제품 재고 차감
```

## 앱에서 열기

1. First Crack에 로그인합니다.
2. 사이드바 **주문**을 엽니다.
3. 상단 탭 **채널**을 선택합니다.
4. 연결할 플랫폼 버튼을 누릅니다.

## 다음에 읽을 문서

- [네이버 스마트스토어](/orders/naver/) — 커머스API 애플리케이션 발급
- [Shopify](/orders/shopify/) — custom app · 권한 스코프
- [Cafe24](/orders/cafe24/) — Mall ID · OAuth 토큰
- [상품 SKU 매핑](/orders/sku-mapping/) — 주문 라인 ↔ 로스팅 상품 연결
- [문제 해결](/orders/troubleshooting/) — 연결 실패 · 주문이 안 들어올 때
