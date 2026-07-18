---
title: マシン接続の概要
description: First Crack でマシンを接続する方法と対応プロトコル
---

接続手順は **モデルと通信方式** によって異なります。First Crack は次の 3 経路をサポートします。

| 方式 | 代表例 | ドキュメント |
|------|--------|--------------|
| **Modbus RTU/TCP** | Delta・Autonics コントローラ、Probat、Giesen、ガスドラム | [Modbus](/ja/machines/modbus/) |
| **Phidget22** | Diedrich、Phidget 温度ボード | [Phidget](/ja/machines/phidget/) |
| **Artisan 設定** | Artisan で既に接続済みのマシン | [Artisan 設定の取り込み](/ja/machines/artisan/) |

:::tip[Artisan / Cropster 互換]
Artisan または Cropster と連携できるモデルなら、First Crack も多くの場合同じ通信設定で接続できます。
:::

## 共通手順

1. デスクトップアプリにログインします。
2. **マシン → マシンを追加** を選びます。
3. 別名、バッチ容量、プリセット（Modbus / Phidget / その他）を入力します。
4. ポート・IP・スレーブ ID・レジスタマップなどを設定します。
5. **接続** を押し、BT・ET がリアルタイム表示されるか確認します。

## 接続方式別チェックリスト

### USB シリアル（Modbus RTU）

- [ ] ロースター–PC の USB ケーブル接続
- [ ] OS 向け [USB–シリアルドライバ](/ja/machines/serial-driver/) のインストール
- [ ] アプリで正しい COM（Windows）/ `/dev/tty.*`（macOS）を選択
- [ ] ボーレート・パリティ・スレーブ ID がマニュアルと一致

### LAN / Wi‑Fi（Modbus TCP）

- [ ] ロースターと PC が同一ネットワーク
- [ ] 固定 IP または DHCP 予約
- [ ] ファイアウォールで Modbus ポート（既定 502）を許可
- [ ] IP 変更時はアプリ設定も更新

### Phidget

- [ ] [Phidget22 ドライバ](/ja/machines/phidget/) と Network Server が稼働
- [ ] Control Panel でセンサー認識
- [ ] アプリで Phidget プリセットとチャンネル対応

## モデルが分からないとき

[お問い合わせ](/ja/support/contact/) に次を送ってください。

- ロースターメーカー・モデル名
- Artisan 利用時は **マシン設定** 画面キャプチャ（→ [Artisan ガイド](/ja/machines/artisan/)）
- 温度コントローラのブランド（Delta、Autonics など）
- USB か LAN か

## 問題があるとき

接続できない・温度がおかしい場合は先に [接続トラブルシューティング](/ja/machines/troubleshooting/) を確認してください。
