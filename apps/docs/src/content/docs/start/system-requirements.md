---
title: 시스템 사양
description: First Crack 데스크톱 앱 최소·권장 사양
---

First Crack은 로스팅 플로어용 **네이티브 데스크톱 앱**입니다. 실시간 온도 그래프와 머신 통신을 위해 아래 사양을 권장합니다.

| OS | 최소 사양 | 권장 사양 |
|----|-----------|-----------|
| **Windows** | Windows 10/11 64-bit, Intel Core i3급, RAM 4GB | Windows 10/11 64-bit, Intel i5급 이상, RAM 8GB |
| **macOS** | macOS 12.0 (Monterey) 이상 | macOS 12 이상 (Apple Silicon 또는 Intel) |

## 네트워크

- **오프라인 로스팅:** 머신 연결·실시간 그래프·로컬 배치 기록은 인터넷 없이 동작합니다.
- **클라우드 동기화:** 프로파일·배치 업로드, 계정 인증 시 인터넷 연결이 필요합니다.
- **Modbus TCP:** 로스터와 PC가 **같은 LAN**에 있어야 합니다. 공유기·방화벽에서 해당 포트(보통 502)가 차단되지 않았는지 확인하세요.

## 주변 장치

- **USB 시리얼:** FTDI·CH340 등 로스터 제조사가 안내하는 USB–시리얼 드라이버 설치가 필요할 수 있습니다. → [시리얼 포트 드라이버](/machines/serial-driver/)
- **Phidget:** Phidget22 런타임·Control Panel 설치가 필요합니다. → [Phidget 연동](/machines/phidget/)

## 지원하지 않는 환경

- 32-bit Windows
- macOS 11 이하
- Linux (현재 공식 빌드 없음 — 문의 시 로드맵 안내)