---
title: Shopify
description: Connect Shopify orders with a custom app Admin API token
---

Create a **custom app** on the store and paste the **Admin API access token** into First Crack.

## Prerequisites

- Shopify store admin access
- Shop domain (e.g. `mystore.myshopify.com`)
- Admin API access token

Official: [Admin API access tokens (custom apps)](https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/generate-app-access-tokens-admin)

## 1. Create the app in Shopify

1. Admin → **Settings** → **Apps and sales channels** → **Develop apps**
2. **Create an app** — name e.g. `First Crack`
3. Configure **Admin API** scopes:

### Required scopes

| Scope | Use |
|-------|-----|
| `read_orders` | List/detail orders |
| `read_products` | Products/SKU (mapping helper) |

Optional:

| Scope | Use |
|-------|-----|
| `read_all_orders` | Orders older than ~60 days |
| `write_orders` | Future tracking reverse-sync |

4. **Install app**, copy the one-time **Admin API access token**, store it safely.

:::caution[Token shown once]
If lost, reinstall or reissue. Do not leave the token in plain text outside First Crack.
:::

## 2. Connect in First Crack

1. App → **Orders** → **Channels**
2. **Connect Shopify**
3. Enter:
   - **Shop domain** — `mystore` or `mystore.myshopify.com`
   - **Admin API access token**
   - (Optional) display name
4. **Connect**

Server validates with GraphQL `shop { name }`.

## 3. Sync

- **Sync now** for an immediate pull
- Default filter: recently updated orders (`updated_at`)
- With base scopes, Shopify policy centers on ~**last 60 days**. Request `read_all_orders` for older history.

## 4. Product link

Set Shopify variant **SKU** equal to First Crack product `sku` for auto mapping.  
→ [SKU mapping](/en/orders/sku-mapping/)

## Status mapping (reference)

| Shopify (display) | First Crack |
|-------------------|-------------|
| financial: pending / authorized | pending |
| financial: paid, not fulfilled | paid |
| fulfillment: partial / on_hold | preparing |
| fulfillment: fulfilled / shipped | shipped |
| financial: refunded / voided | refunded |
| cancelledAt set | cancelled |

## Official docs

- [Orders GraphQL query](https://shopify.dev/docs/api/admin-graphql/latest/queries/orders)
- [Order object](https://shopify.dev/docs/api/admin-graphql/latest/objects/Order)
- [Access scopes](https://shopify.dev/docs/api/usage/access-scopes)

## Troubleshooting

| Symptom | Check |
|---------|-------|
| Unauthorized / 401 | Token trim/spaces, app installed |
| Access denied on orders | `read_orders` scope, reinstall |
| Only some orders | 60-day limit → `read_all_orders` |
| Bad shop domain | Include `.myshopify.com`; prefer myshopify domain over custom domain |

Share **store domain + approx time** only—never the access token. → [Contact](/en/support/contact/)
