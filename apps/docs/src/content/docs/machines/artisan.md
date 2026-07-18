---
title: Artisan 설정 가져오기
description: Artisan 머신 설정을 First Crack으로 옮기는 방법
---

기존에 **Artisan**으로 로스팅 중이라면, 머신 설정 정보를 First Crack에 그대로 옮기면 연동 시간을 크게 줄일 수 있습니다.

## 왜 필요한가

First Crack은 Modbus·Phidget·시리얼 등 Artisan과 **동일한 클래스의 통신**을 지원합니다. Artisan에서 이미 동작하는 설정은 대부분 First Crack에서도 동일 파라미터로 동작합니다.

## Artisan에서 확인할 항목

Artisan 메뉴 **Config → Machine** (또는 **Help → Machines** 설정)에서 다음을 캡처하거나 메모합니다.

| 항목 | 예시 |
|------|------|
| Machine type / Device | Modbus, Phidget, Santoker, etc. |
| Comm port | `COM4`, `/dev/cu.usbserial-1410` |
| Baud rate, parity | 9600 8N1 |
| Host / IP (TCP) | `192.168.0.42` |
| Modbus slave ID | 1 |
| Input register addresses | BT, ET, gas, air |
| Phidget channels | Device serial, channel index |
| Temperature scale | °C, ÷10 등 |

**설정 화면 전체 스크린샷**을 찍어 두면 지원팀이 프리셋을 빠르게 맞춰 드릴 수 있습니다.

## First Crack에 적용

1. **머신** → **머신 추가**
2. Artisan과 동일한 연동 프리셋 선택 (Modbus RTU/TCP, Phidget 등)
3. 포트·IP·슬레이브·레지스터·채널 값을 **Artisan과 동일하게** 입력
4. 연결 후 BT/ET 곡선이 Artisan과 비슷한지 비교

## Cropster 사용자

Cropster는 클라우드 중심이라 로컬 Modbus 설정이 Artisan만큼 노출되지 않을 수 있습니다. 로스터 제조사·모델·온도 컨트롤러 종류를 알려 주시면 First Crack 연동 방법을 안내합니다.

## 프로파일(.alog) 이전

Artisan `.alog` 프로파일은 First Crack으로 **가져오기(Import)** 할 수 있습니다 (앱 내 Import 메뉴). 머신 연결과 별도로, 기존 레퍼런스 곡선을 데스크톱 라이브러리에 추가할 때 사용합니다.

## 지원 요청 시 첨부

[문의](/support/contact/) 시 아래를 보내 주세요.

- Artisan Machine 설정 스크린샷
- 로스터 제조사·모델·연식
- OS (Windows 11 / macOS 14 등)
- 연결 방식 (USB / LAN)