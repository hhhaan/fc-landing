---
title: Order channel troubleshooting
description: Checklist for connect failures, missing orders, and unmapped SKUs
---

## Connect fails

1. **Plan** — if Orders is locked, confirm Enterprise (order sync) plan
2. **Copy/paste** — trim spaces/newlines on Client ID / Secret / token
3. **Platform permissions**
   - Naver: SELF app, valid secret
   - Shopify: app installed, `read_orders`
   - Cafe24: `mall.read_order`, token not expired
4. Read the channel card **last error**
5. After reissuing keys: **disconnect and reconnect**

## Orders not appearing

| Check | Notes |
|-------|-------|
| Sync ran | **Sync now**, last sync time |
| Window | Shopify ~60 days; Cafe24 start/end |
| Status | Only unpaid/test orders? |
| Platform admin | Orders visible in the shop admin? |

Naver collects **changed product orders**. Very old unchanged orders may appear only after the next status change.

## Roast demand is zero

1. Status is **paid / preparing** and not yet **fulfilled**
2. Lines are **active** (not cancel/refund)
3. [SKU mapping](/en/orders/sku-mapping/) attached (`product_id`)
4. Product has green/blend and net weight

## Security

- Do **not** send full Client Secret / access token to First Crack staff.
- If leaked, revoke/reissue on the platform and reconnect the channel.

## Helpful when contacting us

- Platform (Naver / Shopify / Cafe24)
- Shop / Mall ID or display name (no secrets)
- Approximate time
- On-screen error text
- Whether sync succeeds but one order is missing

→ [Contact](/en/support/contact/)
