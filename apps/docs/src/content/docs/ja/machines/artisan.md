---
title: Artisan 設定の取り込み
description: Artisan のマシン設定を First Crack に移す方法
---

すでに **Artisan** で焙煎している場合、マシン設定を First Crack にそのまま移すと接続時間を大幅に短縮できます。

## なぜ有効か

First Crack は Modbus・Phidget・シリアルなど Artisan と **同系統の通信** をサポートします。Artisan で動いているパラメータは、多くの場合 First Crack でも同じ値で動作します。

## Artisan で確認する項目

**Config → Machine**（または Machines ヘルプ画面）から次をメモまたは撮影します。

| 項目 | 例 |
|------|-----|
| Machine type / Device | Modbus, Phidget, Santoker など |
| Comm port | `COM4`, `/dev/cu.usbserial-1410` |
| Baud rate, parity | 9600 8N1 |
| Host / IP (TCP) | `192.168.0.42` |
| Modbus slave ID | 1 |
| Input register addresses | BT, ET, gas, air |
| Phidget channels | デバイスシリアル、チャンネル index |
| Temperature scale | °C、÷10 など |

**設定画面全体のスクリーンショット** があると、サポートがプリセットを素早く合わせられます。

## First Crack への適用

1. **設定 → 焙煎機 → 追加**
2. Artisan と同じプリセットを選択（Modbus RTU/TCP、Phidget など）
3. ポート・IP・スレーブ・レジスタ・チャンネルを **Artisan と同じく** 入力
4. 接続後、BT/ET 曲線を Artisan と比較

## Cropster ユーザー

Cropster はクラウド中心のため、ローカル Modbus 設定が Artisan ほど見えないことがあります。メーカー・モデル・温度コントローラ種別を教えていただければ接続方法をご案内します。

## プロファイル（.alog）の移行

Artisan の `.alog` はアプリの **Import** メニューから取り込めます。マシン接続とは別で、既存のリファレンス曲線をデスクトップライブラリに追加するときに使います。

## サポート依頼時の添付

[お問い合わせ](/ja/support/contact/) 時:

- Artisan Machine 設定のスクショ
- ロースターメーカー・モデル・年式
- OS（Windows 11 / macOS 14 など）
- 接続方式（USB / LAN）
