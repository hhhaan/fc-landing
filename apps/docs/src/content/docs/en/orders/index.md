---
title: Shop order channels
description: Import Naver Smart Store, Cafe24, and Shopify orders into First Crack for roast demand and inventory
---

First Crack **pulls external shop orders** to calculate roast demand and link finished-goods shipments.  
Platform API keys are stored **only on the server** and are not re-exposed in the desktop app.

:::note[Plans]
Order channels need **Enterprise** (or a plan that includes order sync). If the UI is locked, check Settings → Billing.
:::

## Supported channels

| Channel | Auth | Collection |
|---------|------|------------|
| [Naver Smart Store](/en/orders/naver/) | Client ID + Client Secret | Polling (no webhook) |
| [Shopify](/en/orders/shopify/) | Shop domain + Admin API access token | Polling (+ webhooks later) |
| [Cafe24](/en/orders/cafe24/) | Mall ID + Access token | Polling (+ webhooks later) |

## End-to-end flow

1. App → **Orders** → **Channels**
2. Pick platform, enter credentials → **Connect** (server validates via real API)
3. **Sync now** or automatic sync to collect orders
4. [SKU mapping](/en/orders/sku-mapping/), then roast demand & fulfill

```
Shop order placed
    ↓
Sync (order-sync)
    ↓
orders / order_lines saved
    ↓
Match products.sku → roast demand card
    ↓
Fulfill → finished-goods stock decreases
```

## Open in the app

1. Sign in to First Crack.
2. Sidebar **Orders**.
3. Top tab **Channels**.
4. Tap the platform button.

## Next docs

- [Naver Smart Store](/en/orders/naver/) — Commerce API app credentials
- [Shopify](/en/orders/shopify/) — custom app & scopes
- [Cafe24](/en/orders/cafe24/) — Mall ID & OAuth token
- [SKU mapping](/en/orders/sku-mapping/) — order lines ↔ roast products
- [Troubleshooting](/en/orders/troubleshooting/) — connect/sync failures
