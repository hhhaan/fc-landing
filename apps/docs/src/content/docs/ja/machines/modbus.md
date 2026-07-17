---
title: Modbus 連携
description: Modbus RTU/TCP で PLC・温度コントローラ・焙煎機を接続する
---

First Crack は **Modbus RTU**（シリアル）と **Modbus TCP**（ネットワーク）で温度コントローラ・PLC・一部商用ロースターと通信します。

## 適用例

- **ガスドラムロースター** — Delta DTA/DTC、Autonics TK など
- **Probat Probatone** — Type 2/3、LAN Modbus
- **Giesen WxA** — W1A〜W140A、ネットワーク設定後に TCP
- **Loring S、Coffed SR、Cogen C** など Modbus マップが公開されている機種

正確なレジスタアドレス・データ型は **ロースター／コントローラのマニュアル** またはメーカーの Modbus マップに従います。

## Modbus RTU（USB シリアル）

### 1. ハードウェア

- ロースター Modbus ポート ↔ PC の USB–RS485/RS232 アダプタ
- ケーブル・ハブ不良で切れやすいため、直結を推奨します。

### 2. ドライバ

ポート一覧が空なら [シリアルポートドライバー](/ja/machines/serial-driver/) を入れます。

### 3. アプリ設定

**設定 → 焙煎機 → 追加** のあと:

| 項目 | 説明 |
|------|------|
| プリセット | Modbus RTU |
| シリアルポート | `COM3`（Win）/ `cu.usbserial-*`（Mac） |
| Baud rate | 多くは 9600 または 19200（マニュアル確認） |
| Slave ID | コントローラアドレス（多くは 1） |
| BT / ET レジスタ | Holding/Input のアドレスとスケール |

### 4. 確認

BT・ET・RoR がリアルタイム更新されれば成功です。0 や異常スケールならアドレスや `÷10` などを調整します。

## Modbus TCP（LAN）

### 1. ネットワーク

- ロースター IP を確認（パネル・メーカーユーティリティ・DHCP 一覧）。
- PC と **同じサブネット** に置き、固定 IP または DHCP 予約を推奨します。

### 2. アプリ設定

| 項目 | 説明 |
|------|------|
| プリセット | Modbus TCP |
| Host | ロースター IP（例: `192.168.1.50`） |
| Port | 既定 `502` |
| Slave ID | 機器ドキュメント参照 |
| レジスタマップ | BT/ET/ガス・エアなどのチャンネル |

### 3. ファイアウォール

Windows ファイアウォールや社内ルータで 502 のアウトバウンドを許可します。

## Delta / Autonics

多くのドラム・半熱風ロースターが **Delta** コントローラの Modbus RTU を使います。

1. コントローラの通信パラメータ（ボーレート、8N1、Slave ID）を確認
2. BT・ET 熱電対に対応する **PV レジスタ** をマニュアルで探す
3. First Crack に同じ値を入力

Autonics TK シリーズも同様の RTU 手順です。デフォルトアドレスはメーカーごとに異なるため、マニュアル優先です。

## Probat / Giesen

- **Probat:** HMI またはメーカー案内に従い IP・Modbus マップを設定。Type 2 と Type 3 でマップが異なります。
- **Giesen WxA:** 固定 IP 設定後に TCP。Wi‑Fi ブリッジより有線 LAN を推奨。

機種別の詳細アドレスが必要な場合は、モデル名を添えて [お問い合わせ](/ja/support/contact/) ください。

## Artisan からコピー

Artisan **Config → Machine** に Modbus がある場合、ポート・IP・スレーブ・レジスタをそのまま First Crack に移せます。→ [Artisan 設定の取り込み](/ja/machines/artisan/)
