---
title: Cafe24 連携
description: Mall ID と Access token で Cafe24 注文を接続
---

Cafe24 は開発者センターアプリの **OAuth Access token** と **Mall ID** で Admin API を呼び出します。

## 準備物

- Cafe24 ショッピングモール運営者アカウント
- [Cafe24 Developers](https://developers.cafe24.com/) のアプリ
- **Mall ID**（例: `yourmall` → `yourmall.cafe24.com`）
- **Access token**（`mall.read_order` スコープ含む）

公式:

- [Admin API 概要](https://developers.cafe24.com/docs/en/api/)
- [OAuth](https://developers.cafe24.com/en/app/front/app/develop/oauth/)

## 1. 開発者アプリ・トークン

1. [Cafe24 Developers](https://developers.cafe24.com/) でアプリ作成
2. Redirect URI など OAuth を案内どおり設定
3. ショップ管理者アカウントでインストール・同意
4. 発行された **access_token** をコピー
5. **`mall.read_order`** が含まれているか確認

:::tip[トークン更新]
Access token は期限切れになります。**refresh_token** + アプリ Client ID/Secret を First Crack に保存する方式は将来拡張予定です。現状は **有効な access token** を接続 UI に入力し、期限切れ後は再発行して再接続してください。
:::

## 2. Mall ID の確認

- 管理 URL が `https://yourmall.cafe24.com/admin/...` なら Mall ID は **`yourmall`**
- 開発者コンソール・ストア設定でも同じ ID を確認できます

## 3. First Crack で接続

1. アプリ → **注文** → **チャンネル**
2. **Cafe24 を接続**
3. 入力:
   - **Mall ID**
   - **Access token**
   - （任意）表示名
4. **接続**

サーバーは `GET /api/v2/admin/store` でストア情報を検証します。

## 4. 同期

- **今すぐ同期** で即時収集
- API: `GET /api/v2/admin/orders`
- 期間: `start_date` + `end_date`（併用必須）
- 明細: `embed=items,buyer`

## 5. 商品連携

Cafe24 の **`product_no`** または **`product_code`** を First Crack `sku` と合わせます。  
→ [SKU マッピング](/ja/orders/sku-mapping/)

## ステータスマッピング（参考）

| フィールド | 値 | First Crack |
|------------|-----|-------------|
| `canceled` | T | cancelled |
| `paid` | F | pending |
| `paid` | T / M | paid（出荷前） |
| `shipping_status` | F | paid/preparing |
| `shipping_status` | M | shipped |
| `shipping_status` | T | delivered |
| `shipping_status` | W / X | preparing |
| `process_status` | prepare / prepareproduct / hold | preparing |

## 公式ドキュメント

- [Admin API — Orders](https://developers.cafe24.com/docs/en/api/)
- スコープ: **mall.read_order**

## トラブルシューティング

| 症状 | 確認 |
|------|------|
| 401 / invalid token | 期限切れ・誤字、インストール先モール一致 |
| 403 / scope | `mall.read_order` 同意 |
| 注文 0 件 | start/end 期間、テスト注文日、shop_no（マルチショップ） |
| Mall ID エラー | サブドメインのみ（`https://` なし） |

**Mall ID とおおよその時刻** のみ共有し、access token は送らないでください。→ [お問い合わせ](/ja/support/contact/)
