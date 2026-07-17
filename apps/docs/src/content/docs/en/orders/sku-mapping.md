---
title: Product SKU mapping
description: Link shop products to First Crack roast products
---

Orders that **do not match a SKU** are excluded from roast demand and auto-fulfill targets.  
On sync, First Crack attaches local products with the rules below.

## Mapping rules

A line links when one platform ID **string-matches** `products.sku`.

| Platform | Preferred match fields |
|----------|------------------------|
| Naver | `productId`, `optionCode` / `optionManageCode`, seller product code when available |
| Shopify | product id, **variant id**, variant **SKU** |
| Cafe24 | `product_no`, `variant_code`, `product_code` |

**Simplest approach:** put the same seller code / SKU string in both the shop and First Crack **SKU**.

## Setup order

1. First Crack **Orders** → **Products**: create sell SKUs (name, net g, green/blend, profile, **SKU**).
2. Put the same string in the shop seller code / SKU fields (or change First Crack to match the shop).
3. **Channels** → **Sync now**
4. Confirm lines attach products under **Orders**
5. Confirm **roast demand** on dashboard / orders

## Examples

| First Crack product | SKU | Shop |
|---------------------|-----|------|
| Ethiopia 200g | `ETH-200` | Naver seller code `ETH-200` |
| House blend 1kg | `HB-1KG` | Shopify variant SKU `HB-1KG` |
| Decaf 250g | `DEC-250` | Cafe24 product code `DEC-250` |

## When unmapped

- Order appears in the list but **not in roast demand**
- Fulfill may skip stock decrement for that line

After fixing SKUs, **sync again** so later collect/update passes attach mapping (saved lines update when sync refreshes them).

## Manual orders

You can create **Orders → New order** without a channel. Picking products still feeds demand and fulfill.
