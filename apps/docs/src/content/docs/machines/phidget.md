---
title: Phidget 연동
description: Phidget22로 Diedrich 등 온도 인터페이스 연결
---

Phidget22 보드로 BT·ET thermocouple을 읽는 로스터(Diedrich 등)는 First Crack **Phidget** 프리셋으로 연결합니다.

## 1. Phidget22 드라이버 설치

OS에 맞는 Phidget22 런타임을 설치합니다.

- **Windows:** [Phidget22-x64.exe](https://www.phidgets.com/downloads/phidget22/libraries/windows/Phidget22-x64.exe)
- **macOS:** [Phidget22.dmg](https://www.phidgets.com/downloads/phidget22/libraries/macos/Phidget22.dmg)

설치 후 **Phidget Control Panel**을 실행합니다.

## 2. Network Server 설정

First Crack이 로컬 Phidget 서버에 접속하려면 Network Server가 켜져 있어야 합니다.

### Windows

1. **Phidget Control Panel** 실행
2. **Network Server** 탭 선택
3. **Startup Type:** Automatic
4. **Enabled** 체크 → **Start** 클릭
5. 하단 상태가 **Running** 인지 확인

### macOS

1. **Phidget Control Panel** 실행 (Launchpad)
2. **Network Server** 탭 선택
3. 자물쇠 아이콘 → 관리자 비밀번호 입력
4. **Start Automatically on Boot**, **Enabled** 체크
5. **Start Network Server** 클릭

## 3. 센서 인식 확인

Control Panel **Devices** 탭에서 thermocouple 인터페이스(예: TMP1100, 1048)가 보이고 온도가 갱신되는지 확인합니다. 인식이 안 되면 USB 케이블·보드 전원·드라이버 재설치를 시도합니다.

## 4. First Crack 설정

1. 앱 **머신** → **머신 추가**
2. 별칭, 로스터 모델, 배치 용량 입력
3. 연동 프리셋 **Phidget** 선택
4. BT / ET 채널을 Phidget 디바이스·채널 번호에 맞게 매핑
5. 저장 후 연결 — 실시간 온도가 표시되면 완료

## Diedrich 로스터

Diedrich는 Phidget 기반 온도 입력이 일반적입니다. Artisan에서 Phidget로 연동 중이었다면 동일 채널 번호를 First Crack에 적용하세요.

## 문제 해결

- **온도 없음:** Network Server가 Running 인지, 방화벽이 로컬 포트를 막지 않는지 확인
- **채널 오류:** Control Panel의 채널 번호와 앱 매핑이 일치하는지 확인
- **다른 PC로 이전:** Phidget 드라이버·Network Server 설정을 새 PC에서 다시 수행 → [연동 문제 해결](/machines/troubleshooting/)