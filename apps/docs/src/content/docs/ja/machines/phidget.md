---
title: Phidget 連携
description: Phidget22 で Diedrich などの温度インターフェースを接続する
---

Phidget22 ボードで BT・ET 熱電対を読むロースター（Diedrich など）は、First Crack の **Phidget** プリセットで接続します。

## 1. Phidget22 ドライバのインストール

OS 向け Phidget22 ランタイムを入れます。

- **Windows:** [Phidget22-x64.exe](https://www.phidgets.com/downloads/phidget22/libraries/windows/Phidget22-x64.exe)
- **macOS:** [Phidget22.dmg](https://www.phidgets.com/downloads/phidget22/libraries/macos/Phidget22.dmg)

その後 **Phidget Control Panel** を起動します。

## 2. Network Server

First Crack がローカル Phidget サーバに接続するには Network Server が必要です。

### Windows

1. **Phidget Control Panel** を起動
2. **Network Server** タブ
3. **Startup Type:** Automatic
4. **Enabled** にチェック → **Start**
5. 状態が **Running** であることを確認

### macOS

1. **Phidget Control Panel** を起動（Launchpad）
2. **Network Server** タブ
3. 鍵アイコン → 管理者パスワード
4. **Start Automatically on Boot** と **Enabled** をオン
5. **Start Network Server**

## 3. センサー認識

Control Panel の **Devices** で熱電対インターフェース（例: TMP1100、1048）が見え、温度が更新されるか確認します。認識されない場合は USB・電源・ドライバ再インストールを試します。

## 4. First Crack 設定

1. アプリ **マシン → 追加**
2. 別名・モデル・バッチ容量
3. プリセット **Phidget**
4. BT / ET をデバイス・チャンネル番号に合わせてマッピング
5. 保存して接続 — リアルタイム温度が出れば完了

## Diedrich

Diedrich は Phidget ベースの温度入力が一般的です。Artisan で Phidget 連携済みなら、同じチャンネル番号を使ってください。

## トラブルシューティング

- **温度なし:** Network Server が Running か、ファイアウォールがローカルポートを塞いでいないか
- **チャンネルエラー:** Control Panel とアプリの番号一致を確認
- **別 PC へ移行:** ドライバと Network Server を再設定 → [トラブルシューティング](/ja/machines/troubleshooting/)
