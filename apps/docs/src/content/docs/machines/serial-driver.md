---
title: 시리얼 포트 드라이버
description: USB 시리얼 포트가 보이지 않을 때 드라이버 설치
---

Modbus RTU 등 **USB–시리얼**로 로스터에 연결할 때, OS에 맞는 USB 드라이버가 없으면 First Crack 포트 목록이 비어 있습니다.

## 증상

- 머신 설정의 시리얼 포트 목록이 비어 있음
- USB를 꽂아도 포트가 추가되지 않음
- 연결 시 “포트를 열 수 없음” 오류

## Windows

### 1. 장치 관리자 확인

`Win + X` → **장치 관리자** → **포트(COM & LPT)** 에 `COMx` 항목이 있는지 확인합니다.

- **알 수 없는 장치** 또는 **USB Serial**에 느낌표가 있으면 드라이버 미설치입니다.

### 2. 드라이버 설치

로스터·USB 어댑터 제조사 안내를 따릅니다. 흔한 칩셋:

| 칩셋 | 드라이버 |
|------|----------|
| FTDI | [FTDI VCP](https://ftdichip.com/drivers/vcp-drivers/) |
| CH340 / CH341 | 제조사 또는 [WCH](http://www.wch-ic.com/downloads/CH341SER_EXE.html) |
| CP210x | [Silicon Labs](https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers) |
| Prolific PL2303 | 제조사 패키지 |

로스터 패키지에 포함된 CD/USB 메모리의 드라이버를 우선 사용하세요.

### 3. 포트 번호 확인

드라이버 설치 후 장치 관리자에 표시된 **COM 번호**(예: COM5)를 First Crack 머신 설정에 입력합니다.

## macOS

1. USB 어댑터 연결 후 **시스템 설정 → 일반 → 정보 → 시스템 리포트 → USB** 에서 인식 여부 확인
2. FTDI 등 제조사 macOS 드라이버 설치 (일부 최신 macOS는 내장 드라이버만으로 동작)
3. 터미널에서 `ls /dev/cu.*` 로 `cu.usbserial-*` 또는 `cu.wchusbserial*` 확인
4. First Crack에서 해당 `/dev/cu....` 포트 선택

## 여전히 안 될 때

1. USB 케이블·포트·허브 교체 (허브 없이 PC 직결 권장)
2. 다른 PC에서 동일 케이블로 테스트
3. 로스터 본체 Modbus 포트·설정(통신 ON) 확인
4. [연동 문제 해결](/machines/troubleshooting/) 및 [문의](/support/contact/)