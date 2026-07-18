---
title: Import Artisan settings
description: Move Artisan machine settings into First Crack
---

If you already roast with **Artisan**, copying machine settings into First Crack is the fastest path.

## Why this helps

First Crack supports the same **class of links** as Artisan (Modbus, Phidget, serial, etc.). Parameters that work in Artisan usually work in First Crack unchanged.

## What to capture in Artisan

From **Config → Machine** (or machine help screens), note or screenshot:

| Field | Examples |
|-------|----------|
| Machine type / Device | Modbus, Phidget, Santoker, etc. |
| Comm port | `COM4`, `/dev/cu.usbserial-1410` |
| Baud, parity | 9600 8N1 |
| Host / IP (TCP) | `192.168.0.42` |
| Modbus slave ID | 1 |
| Input register addresses | BT, ET, gas, air |
| Phidget channels | Device serial, channel index |
| Temperature scale | °C, ÷10, etc. |

A **full settings screenshot** helps support build a preset quickly.

## Apply in First Crack

1. **Machines → Add**
2. Choose the same preset as Artisan (Modbus RTU/TCP, Phidget, …)
3. Enter port, IP, slave, registers, channels **exactly as in Artisan**
4. Connect and compare BT/ET curves to Artisan

## Cropster users

Cropster is more cloud-oriented; local Modbus details may be less visible. Send roaster make/model and controller type and we will guide the setup.

## Profile (.alog) import

You can **Import** Artisan `.alog` profiles in the app (Import menu). That is separate from machine connection—use it to add reference curves to the desktop library.

## What to attach when asking for help

Via [Contact](/en/support/contact/):

- Artisan Machine settings screenshot
- Roaster make, model, year
- OS (Windows 11 / macOS 14, etc.)
- Connection type (USB / LAN)
