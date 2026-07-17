---
title: Cafe24
description: Connect Cafe24 orders with Mall ID and Access token
---

Cafe24 Admin API uses an app **OAuth access token** plus **Mall ID**.

## Prerequisites

- Cafe24 store admin account
- App on [Cafe24 Developers](https://developers.cafe24.com/)
- **Mall ID** (e.g. `yourmall` → `yourmall.cafe24.com`)
- **Access token** including `mall.read_order`

Official:

- [Admin API overview](https://developers.cafe24.com/docs/en/api/)
- [OAuth](https://developers.cafe24.com/en/app/front/app/develop/oauth/)

## 1. Developer app & token

1. Create an app on [Cafe24 Developers](https://developers.cafe24.com/).
2. Configure OAuth (redirect URI, etc.) per app docs.
3. Install/consent with the store admin account.
4. Copy the **access_token**.
5. Confirm **`mall.read_order`** is granted.

:::tip[Token refresh]
Access tokens expire. Storing **refresh_token** + app Client ID/Secret in First Crack may come later. Today, paste a **valid access token** in the connect UI and reconnect after reissue.
:::

## 2. Mall ID

- Admin URL `https://yourmall.cafe24.com/admin/...` → Mall ID is **`yourmall`**
- Same ID appears in developer console / store settings

## 3. Connect in First Crack

1. App → **Orders** → **Channels**
2. **Connect Cafe24**
3. Enter:
   - **Mall ID**
   - **Access token**
   - (Optional) display name
4. **Connect**

Server validates with `GET /api/v2/admin/store`.

## 4. Sync

- **Sync now** for immediate pull
- API: `GET /api/v2/admin/orders`
- Window: `start_date` + `end_date` (required together)
- Lines: `embed=items,buyer`

## 5. Product link

Align Cafe24 **`product_no`** or **`product_code`** with First Crack `sku`.  
→ [SKU mapping](/en/orders/sku-mapping/)

## Status mapping (reference)

| Field | Value | First Crack |
|-------|-------|-------------|
| `canceled` | T | cancelled |
| `paid` | F | pending |
| `paid` | T / M | paid (pre-ship) |
| `shipping_status` | F | paid/preparing |
| `shipping_status` | M | shipped |
| `shipping_status` | T | delivered |
| `shipping_status` | W / X | preparing |
| `process_status` | prepare / prepareproduct / hold | preparing |

## Official docs

- [Admin API — Orders](https://developers.cafe24.com/docs/en/api/)
- Scope: **mall.read_order**

## Troubleshooting

| Symptom | Check |
|---------|-------|
| 401 / invalid token | Expired/typo; app installed on this mall |
| 403 / scope | `mall.read_order` consent |
| Zero orders | start/end window, test order dates, shop_no (multi-shop) |
| Mall ID error | Subdomain only (no `https://`) |

Share **Mall ID + approx time** only—never the access token. → [Contact](/en/support/contact/)
