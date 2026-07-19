---
title: EC注文連携
description: Naver Smart Store、Cafe24、Shopify の注文を First Crack に取り込み、焙煎必要量・在庫とつなぐ
---

EC の注文を取り込み、焙煎必要量を計算し、完成品在庫・出荷とつなぎます。  
API キーは **サーバーのみ** に保存され、アプリには再ダウンロードされません。

:::note[料金プラン]
注文・チャンネル連携は **Pro+** および **Enterprise** プランで利用できます。ロック画面が出る場合は設定 → お支払いでプランを確認してください。
:::

## 対応チャンネル

| チャンネル | 接続方式 | 収集方式 |
|------------|----------|----------|
| [Naver Smart Store](/ja/orders/naver/) | Client ID + Client Secret | 定期ポーリング（Webhook なし） |
| [Shopify](/ja/orders/shopify/) | ショップドメイン + Admin API access token | ポーリング（将来 Webhook） |
| [Cafe24](/ja/orders/cafe24/) | Mall ID + Access token | ポーリング（将来 Webhook） |

## 全体フロー

1. アプリ → **注文** → **チャンネル**
2. プラットフォームを選び資格情報を入力 → **接続**（サーバーが実 API で検証）
3. **今すぐ同期** または自動同期で注文収集
4. [SKU マッピング](/ja/orders/sku-mapping/) の後、焙煎必要量・出荷を利用

```
EC で注文発生
    ↓
同期 (order-sync)
    ↓
orders / order_lines 保存
    ↓
products.sku と照合 → 焙煎必要量カード
    ↓
出荷処理 → 完成品在庫減
```

## アプリでの開き方

1. First Crack にログイン
2. サイドバー **注文**
3. 上部タブ **チャンネル**
4. 連携するプラットフォームボタンを押す

## 次に読むドキュメント

- [Naver Smart Store](/ja/orders/naver/) — Commerce API アプリ発行
- [Shopify](/ja/orders/shopify/) — カスタムアプリとスコープ
- [Cafe24](/ja/orders/cafe24/) — Mall ID と OAuth トークン
- [SKU マッピング](/ja/orders/sku-mapping/) — 注文明細 ↔ 焙煎商品
- [トラブルシューティング](/ja/orders/troubleshooting/) — 接続失敗・注文が来ないとき
