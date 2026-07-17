---
title: システム要件
description: First Crack デスクトップアプリの最小・推奨スペック
---

First Crack は焙煎フロア向けの **ネイティブデスクトップアプリ** です。リアルタイム温度グラフとマシン通信のため、次のスペックを推奨します。

| OS | 最小 | 推奨 |
|----|------|------|
| **Windows** | Windows 10/11 64-bit、Intel Core i3 相当、RAM 4GB | Windows 10/11 64-bit、Intel i5 以上、RAM 8GB |
| **macOS** | macOS 12.0 (Monterey) 以上 | macOS 12 以上（Apple Silicon または Intel） |

## ネットワーク

- **オフライン焙煎:** マシン接続・リアルタイムグラフ・ローカルバッチ記録はインターネット不要です。
- **クラウド同期:** プロファイル・バッチのアップロード、アカウント認証には接続が必要です。
- **Modbus TCP:** ロースターと PC は **同じ LAN** に置いてください。ルータ・ファイアウォールで対象ポート（通常 502）が塞がれていないか確認します。

## 周辺機器

- **USB シリアル:** FTDI・CH340 など製造元が案内する USB–シリアルドライバが必要な場合があります。→ [シリアルポートドライバー](/ja/machines/serial-driver/)
- **Phidget:** Phidget22 ランタイムと Control Panel のインストールが必要です。→ [Phidget 連携](/ja/machines/phidget/)

## 非対応環境

- 32-bit Windows
- macOS 11 以前
- Linux（現在公式ビルドなし — お問い合わせ時にロードマップをご案内）
