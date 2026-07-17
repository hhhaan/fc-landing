---
title: Naver Smart Store 連携
description: Commerce API の Client ID・Secret で Naver 注文を First Crack に接続
---

Naver には **Webhook が無い** ため、First Crack が変更された注文を定期的に照会します。  
認証は Commerce API の **Client Credentials + 電子署名** です。（公式: [Commerce API 認証](https://apicenter.commerce.naver.com/docs/auth)）

## 準備物

- Naver Smart Store 販売者アカウント
- [Naver Commerce API Center](https://apicenter.commerce.naver.com/) へのアクセス
- **自店（SELF）** 用アプリの **Client ID** と **Client Secret**

## 1. Commerce API アプリの発行

1. [Commerce API Center](https://apicenter.commerce.naver.com/) にログイン
2. 連携する Smart Store（販売チャンネル）に **アプリケーション** を登録
3. 次をコピー
   - **Client ID**（アプリケーション ID）
   - **Client Secret**（`$2a$…` 形式が多い）
4. トークン種別は **SELF**。First Crack は `type=SELF` でトークンを取得します。

:::caution[シークレットの保管]
Client Secret はパスワードと同じです。メッセンジャー・スクショ・公開リポジトリに載せないでください。First Crack では **サーバー専用ストレージ** のみに保存します。
:::

## 2. First Crack で接続

1. アプリ → **注文** → **チャンネル**
2. **Naver Smart Store を接続**
3. 入力:
   - **Client ID**
   - **Client Secret**
   - （任意）表示名 — 例: `本店 Smart Store`
4. **接続**

接続時にサーバーが実際のトークン発行・注文 API で検証します。失敗時はキー・権限・ストア状態を確認してください。

## 3. 注文同期

- **今すぐ同期**: そのチャンネル（または全チャンネル）を即時収集
- 自動同期: サーバースケジュールが有効な環境では変更注文を定期取得

収集の概要:

- 変更商品注文照会 → 商品注文番号一覧
- 詳細照会（1 回最大 300 件）後 First Crack 注文として保存

## 4. 商品連携

注文明細のチャンネル商品番号・販売者商品コードと **First Crack 商品 SKU** を合わせます。  
詳細: [SKU マッピング](/ja/orders/sku-mapping/)

推奨:

- Smart Store **販売者商品コード**（`sellerProductCode`）= First Crack `products.sku`
- またはチャンネル商品番号 / オプションコードを SKU として登録

## ステータスマッピング（参考）

| Naver `productOrderStatus` | First Crack |
|-----------------------------|-------------|
| PAYMENT_WAITING | pending（支払い待ち） |
| PAYED | paid |
| DELIVERING | shipped |
| DELIVERED / PURCHASE_DECIDED | delivered |
| CANCELED / CANCELED_BY_NOPAYMENT | cancelled |
| RETURNED | refunded |

クレームが `CANCEL_DONE` / `RETURN_DONE` などの場合はキャンセル・返金を優先します。

## 公式ドキュメント

- [認証](https://apicenter.commerce.naver.com/docs/auth)
- [変更商品注文](https://apicenter.commerce.naver.com/docs/commerce-api/current/seller-get-last-changed-status-pay-order-seller)
- [商品注文詳細](https://apicenter.commerce.naver.com/docs/commerce-api/current/seller-get-product-orders-pay-order-seller)

## トラブルシューティング

| 症状 | 確認 |
|------|------|
| 接続失敗・token エラー | ID/Secret の誤字、bcrypt 形式の Secret、SELF アプリか |
| 注文 0 件 | 最近の変更注文があるか、支払い後か、最終同期時刻 |
| 401 GW.AUTHN | トークン期限 — 次回同期で再発行。繰り返す場合は Secret 再発行 |

続く場合は [お問い合わせ](/ja/support/contact/) に **表示名・おおよその時刻・エラー文** を送ってください（Secret は送らないでください）。
