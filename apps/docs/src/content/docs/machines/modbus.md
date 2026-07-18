---
title: Modbus 연동
description: Modbus RTU/TCP로 PLC·온도 컨트롤러·로스팅 머신 연결
---

First Crack은 **Modbus RTU**(시리얼)와 **Modbus TCP**(네트워크)를 통해 온도 컨트롤러·PLC·일부 상용 로스터와 통신합니다.

## 적용 사례

- **국산 소형·중형 가스 로스터** — Delta DTA/DTC, Autonics TK 시리즈 등 온도 컨트롤러
- **Probat Probatone** — Type 2/3, LAN Modbus
- **Giesen WxA** — W1A ~ W140A, 네트워크 설정 후 TCP
- **Loring S, Coffed SR, Cogen C** 등 Modbus 문서가 있는 기종

정확한 레지스터 주소·데이터 타입은 **로스터·컨트롤러 매뉴얼** 또는 제조사 Modbus 맵을 따릅니다.

## Modbus RTU (USB 시리얼)

### 1. 하드웨어

- 로스터 Modbus 포트 ↔ PC USB–RS485/RS232 어댑터
- 케이블·허브 불량 시 연결이 끊기므로 직결을 권장합니다.

### 2. 드라이버

포트 목록이 비어 있으면 [시리얼 포트 드라이버](/machines/serial-driver/)를 설치합니다.

### 3. 앱 설정

**머신** → **머신 추가** 후:

| 항목 | 설명 |
|------|------|
| 연동 프리셋 | Modbus RTU |
| 시리얼 포트 | `COM3`(Win) / `cu.usbserial-*`(Mac) |
| Baud rate | 보통 9600 또는 19200 (매뉴얼 확인) |
| Slave ID | 컨트롤러 주소 (보통 1) |
| BT / ET 레지스터 | Holding/Input register 주소·스케일 |

### 4. 확인

연결 후 BT·ET·RoR이 실시간으로 갱신되면 성공입니다. 값이 0이거나 비정상 스케일이면 레지스터 주소·`÷10` 등 스케일 팩터를 조정합니다.

## Modbus TCP (LAN)

### 1. 네트워크

- 로스터 IP를 확인합니다 (패널·제조사 유틸·공유기 DHCP 목록).
- PC와 **같은 서브넷**에 두고, IP가 바뀌지 않도록 고정 IP 또는 DHCP 예약을 권장합니다.

### 2. 앱 설정

| 항목 | 설명 |
|------|------|
| 연동 프리셋 | Modbus TCP |
| Host | 로스터 IP (예: `192.168.1.50`) |
| Port | 기본 `502` |
| Slave ID | 장비별 문서 참고 |
| 레지스터 맵 | BT/ET/가스·에어 등 채널별 주소 |

### 3. 방화벽

Windows 방화벽·사내 공유기에서 502 포트 아웃바운드를 허용합니다.

## Delta / Autonics (국산 로스터)

많은 국산 드럼·반열풍 로스터가 **Delta 온도 컨트롤러** Modbus RTU를 사용합니다.

1. 컨트롤러 통신 파라미터(보드레이트, 8N1, Slave ID)를 확인합니다.
2. BT·ET thermocouple 입력 채널에 대응하는 **PV 레지스터** 주소를 매뉴얼에서 찾습니다.
3. First Crack 머신 설정에 동일 값을 입력합니다.

Autonics TK 시리즈도 동일한 흐름으로 RTU 연결합니다. 제조사별 기본 주소가 다를 수 있으니 매뉴얼을 우선합니다.

## Probat / Giesen 등 상용 로스터

- **Probat:** 로스터 HMI 또는 제조사 안내에 따라 IP·Modbus 맵 설정. Type 2와 Type 3는 맵이 다릅니다.
- **Giesen WxA:** 로스터 네트워크 설정(고정 IP) 후 TCP로 연결. Wi-Fi 브리지보다 유선 LAN을 권장합니다.

제조사별 상세 주소가 필요하면 [문의](/support/contact/) 시 모델명을 알려 주세요.

## Artisan에서 Modbus 설정 복사

Artisan **Config → Machine** 에 Modbus가 설정되어 있다면, 포트·IP·슬레이브·레지스터 값을 First Crack에 그대로 옮기면 됩니다. → [Artisan 설정 가져오기](/machines/artisan/)