---
title: Shopify 連携
description: カスタムアプリの Admin API トークンで Shopify 注文を接続
---

ストアに **カスタムアプリ** を作り、発行された **Admin API access token** を First Crack に貼り付けます。

## 準備物

- Shopify ストア管理者権限
- ショップドメイン（例: `mystore.myshopify.com`）
- Admin API access token

公式: [Admin API access tokens (custom apps)](https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/generate-app-access-tokens-admin)

## 1. Shopify でアプリ作成

1. 管理画面 → **設定** → **アプリと販売チャネル** → **アプリを開発**
2. **アプリを作成** — 名前例: `First Crack`
3. **Admin API 統合** でスコープを有効化

### 必須スコープ

| スコープ | 用途 |
|----------|------|
| `read_orders` | 注文一覧・詳細 |
| `read_products` | 商品・SKU（マッピング補助） |

任意:

| スコープ | 用途 |
|----------|------|
| `read_all_orders` | **約 60 日より古い** 注文 |
| `write_orders` | 将来の発送（送り状）逆連携 |

4. **アプリをインストール** 後、一度だけ表示される **Admin API access token** を安全な場所に保存

:::caution[トークンは一度だけ表示]
紛失時は再インストールまたは再発行が必要です。First Crack 以外に平文で残さないでください。
:::

## 2. First Crack で接続

1. アプリ → **注文** → **チャンネル**
2. **Shopify を接続**
3. 入力:
   - **Shop domain** — `mystore` または `mystore.myshopify.com`
   - **Admin API access token**
   - （任意）表示名
4. **接続**

サーバーは GraphQL `shop { name }` でトークンを検証します。

## 3. 同期

- **今すぐ同期** で即時収集
- 既定フィルタ: 最近更新された注文（`updated_at`）
- 基本スコープのみの場合、Shopify ポリシー上 **約 60 日** が中心です。古い履歴が必要なら `read_all_orders` を申請してください。

## 4. 商品連携

Shopify variant の **SKU** を First Crack 商品 `sku` と同じにすると明細が自動マッピングされます。  
→ [SKU マッピング](/ja/orders/sku-mapping/)

## ステータスマッピング（参考）

| Shopify（表示用） | First Crack |
|-------------------|-------------|
| financial: pending / authorized | pending |
| financial: paid + 未出荷 | paid |
| fulfillment: partial / on_hold など | preparing |
| fulfillment: fulfilled / shipped | shipped |
| financial: refunded / voided | refunded |
| cancelledAt あり | cancelled |

## 公式ドキュメント

- [Orders GraphQL query](https://shopify.dev/docs/api/admin-graphql/latest/queries/orders)
- [Order object](https://shopify.dev/docs/api/admin-graphql/latest/objects/Order)
- [Access scopes](https://shopify.dev/docs/api/usage/access-scopes)

## トラブルシューティング

| 症状 | 確認 |
|------|------|
| Unauthorized / 401 | トークンの前後空白、アプリインストール |
| Access denied on orders | `read_orders`、再インストール |
| 一部の注文のみ | 60 日制限 → `read_all_orders` |
| ショップドメインエラー | `.myshopify.com` の有無、カスタムドメインより myshopify ドメイン |

**ストアドメインとおおよその時刻** のみ共有し、access token は送らないでください。→ [お問い合わせ](/ja/support/contact/)
