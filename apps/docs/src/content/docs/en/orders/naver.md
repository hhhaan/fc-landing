---
title: Naver Smart Store
description: Connect Naver orders to First Crack with Commerce API Client ID and Secret
---

Naver has **no webhook**, so First Crack polls for changed orders on a schedule.  
Auth uses Commerce API **Client Credentials + signature**. (Official: [Commerce API auth](https://apicenter.commerce.naver.com/docs/auth))

## Prerequisites

- Naver Smart Store seller account
- Access to [Naver Commerce API Center](https://apicenter.commerce.naver.com/)
- **SELF** (own store) app **Client ID** and **Client Secret**

## 1. Create a Commerce API app

1. Sign in to [Commerce API Center](https://apicenter.commerce.naver.com/).
2. Register an **application** for the Smart Store (or sales channel) you will link.
3. Copy:
   - **Client ID** (application ID)
   - **Client Secret** (secret — often looks like `$2a$…`)
4. Use token type **SELF**. First Crack requests tokens with `type=SELF`.

:::caution[Protect the secret]
Treat Client Secret like a password. Never post it in chat, screenshots, or public repos. First Crack stores it only in **server-side** storage.
:::

## 2. Connect in First Crack

1. App → **Orders** → **Channels**
2. **Connect Naver Smart Store**
3. Enter:
   - **Client ID**
   - **Client Secret**
   - (Optional) display name — e.g. `Main Smart Store`
4. **Connect**

The server validates by issuing a token and calling the order API. On failure, check keys, permissions, and store status.

## 3. Order sync

- **Sync now**: pull that channel (or all channels) immediately
- Auto sync: periodic pulls when the server schedule is enabled

Collection (summary):

- Changed product-order list → product order IDs
- Detail fetch (up to 300 per call) → save as First Crack orders

## 4. Product link

Match channel product IDs / seller codes on order lines to **First Crack product SKU**.  
Details: [SKU mapping](/en/orders/sku-mapping/)

Recommended:

- Smart Store **seller product code** (`sellerProductCode`) = First Crack `products.sku`
- Or register channel product / option codes as SKUs

## Status mapping (reference)

| Naver `productOrderStatus` | First Crack |
|-----------------------------|-------------|
| PAYMENT_WAITING | pending |
| PAYED | paid |
| DELIVERING | shipped |
| DELIVERED / PURCHASE_DECIDED | delivered |
| CANCELED / CANCELED_BY_NOPAYMENT | cancelled |
| RETURNED | refunded |

Claims like `CANCEL_DONE` / `RETURN_DONE` map to cancel/refund first.

## Official docs

- [Auth](https://apicenter.commerce.naver.com/docs/auth)
- [Changed product orders](https://apicenter.commerce.naver.com/docs/commerce-api/current/seller-get-last-changed-status-pay-order-seller)
- [Product order details](https://apicenter.commerce.naver.com/docs/commerce-api/current/seller-get-product-orders-pay-order-seller)

## Troubleshooting

| Symptom | Check |
|---------|-------|
| Connect / token errors | Typo in ID/Secret, bcrypt-style secret, SELF app |
| Zero orders | Recent changes? Paid status? Last sync time |
| 401 GW.AUTHN | Token expiry — next sync reissues. If repeated, reissue Secret |

If it keeps failing, email [Contact](/en/support/contact/) with **display name, approx time, error text** (never the Secret).
