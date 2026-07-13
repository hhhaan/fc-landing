---
title: 로스팅 머신 연동 개요
description: First Crack에서 로스팅 머신을 연결하는 방법과 지원 프로토콜
---

로스팅 머신은 **모델·통신 방식**에 따라 연동 절차가 다릅니다. First Crack은 아래 세 경로를 지원합니다.

| 방식 | 대표 사례 | 문서 |
|------|-----------|------|
| **Modbus RTU/TCP** | Delta·Autonics 컨트롤러, Probat, Giesen, 국산 가스 로스터 | [Modbus 연동](/machines/modbus/) |
| **Phidget22** | Diedrich, Phidget 기반 온도 보드 | [Phidget 연동](/machines/phidget/) |
| **Artisan 설정 참고** | Artisan에서 이미 연동 중인 머신 | [Artisan 설정 가져오기](/machines/artisan/) |

:::tip[Artisan / Cropster 호환]
Artisan 또는 Cropster와 연동 가능한 모델이면 First Crack도 대부분 동일한 통신 설정으로 연결할 수 있습니다.
:::

## 공통 연결 절차

1. 데스크톱 앱에 로그인합니다.
2. **설정 → 로스팅 머신 → 머신 추가**를 선택합니다.
3. 별칭, 로스터 용량(배치 크기), 연동 프리셋(Modbus / Phidget / 기타)을 입력합니다.
4. 포트·IP·슬레이브 ID·레지스터 맵 등 머신별 값을 설정합니다.
5. **연결**을 눌러 BT·ET 등 실시간 온도가 표시되는지 확인합니다.

## 연결 방식별 체크리스트

### USB 시리얼 (Modbus RTU)

- [ ] 로스터–PC USB 케이블 연결
- [ ] OS에 맞는 [USB–시리얼 드라이버](/machines/serial-driver/) 설치
- [ ] 앱에서 올바른 COM 포트(Windows) / `/dev/tty.*`(macOS) 선택
- [ ] 보드레이트·패리티·슬레이브 ID가 로스터 매뉴얼과 일치

### LAN / Wi-Fi (Modbus TCP)

- [ ] 로스터와 PC가 동일 네트워크
- [ ] 로스터 IP 고정 또는 DHCP 예약
- [ ] 방화벽·공유기에서 Modbus 포트(기본 502) 허용
- [ ] IP 변경 시 앱 내 머신 설정 IP 업데이트

### Phidget

- [ ] [Phidget22 드라이버](/machines/phidget/) 및 Network Server 실행
- [ ] Control Panel에서 센서 인식 확인
- [ ] 앱에서 Phidget 프리셋 선택 후 채널 매핑

## 모델을 모를 때

다음 정보를 [문의](/support/contact/)에 함께 보내 주시면 프리셋 구성을 도와드립니다.

- 로스터 제조사·모델명
- Artisan 사용 시 **머신 설정** 화면 캡처 (→ [Artisan 가이드](/machines/artisan/))
- 온도 컨트롤러 브랜드(Delta, Autonics 등)
- USB인지 LAN인지

## 문제가 있을 때

연결이 안 되거나 온도가 비정상이면 [연동 문제 해결](/machines/troubleshooting/)을 먼저 확인해 주세요.