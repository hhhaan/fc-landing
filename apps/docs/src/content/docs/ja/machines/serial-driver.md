---
title: シリアルポートドライバー
description: USB シリアルポートが見えないときのドライバ導入
---

Modbus RTU など **USB–シリアル** でロースターに接続する場合、OS に正しい USB ドライバが無いと First Crack のポート一覧が空になります。

## 症状

- マシン設定のシリアルポート一覧が空
- USB を挿してもポートが増えない
- 接続時に「ポートを開けない」エラー

## Windows

### 1. デバイスマネージャー

`Win + X` → **デバイスマネージャー** → **ポート (COM と LPT)** に `COMx` があるか確認します。

- **不明なデバイス** や **USB Serial** に感嘆符がある場合はドライバ未導入です。

### 2. ドライバのインストール

ロースター・USB アダプタのメーカー案内に従います。よくあるチップセット:

| チップセット | ドライバ |
|--------------|----------|
| FTDI | [FTDI VCP](https://ftdichip.com/drivers/vcp-drivers/) |
| CH340 / CH341 | メーカーまたは [WCH](http://www.wch-ic.com/downloads/CH341SER_EXE.html) |
| CP210x | [Silicon Labs](https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers) |
| Prolific PL2303 | メーカーパッケージ |

ロースター同梱の CD/USB のドライバを優先してください。

### 3. ポート番号

導入後、デバイスマネージャーに表示される **COM 番号**（例: COM5）を First Crack に入力します。

## macOS

1. アダプタ接続後 **システム設定 → 一般 → 情報 → システムレポート → USB** で認識を確認
2. 必要ならメーカーの macOS ドライバを導入（新しい macOS は内蔵のみで動く場合あり）
3. ターミナルで `ls /dev/cu.*` し `cu.usbserial-*` や `cu.wchusbserial*` を確認
4. First Crack で該当 `/dev/cu....` を選択

## まだダメなとき

1. USB ケーブル・ポート・ハブを交換（ハブ無し直結推奨）
2. 別 PC で同じケーブルを試す
3. ロースター本体の Modbus ポート・通信 ON 設定を確認
4. [トラブルシューティング](/ja/machines/troubleshooting/) と [お問い合わせ](/ja/support/contact/)
