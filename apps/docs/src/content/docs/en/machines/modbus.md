---
title: Modbus setup
description: Connect PLC, temperature controllers, and roasters over Modbus RTU/TCP
---

First Crack talks to temperature controllers, PLCs, and some commercial roasters over **Modbus RTU** (serial) and **Modbus TCP** (network).

## Typical setups

- **Gas drum roasters** — Delta DTA/DTC, Autonics TK, and similar controllers
- **Probat Probatone** — Type 2/3, LAN Modbus
- **Giesen WxA** — W1A–W140A after network setup, TCP
- **Loring S, Coffed SR, Cogen C**, and other machines with a published Modbus map

Use the **roaster/controller manual** (or manufacturer Modbus map) for register addresses and data types.

## Modbus RTU (USB serial)

### 1. Hardware

- Roaster Modbus port ↔ PC USB–RS485/RS232 adapter
- Prefer a direct cable; flaky hubs/cables drop the link.

### 2. Drivers

If the port list is empty, install [serial port drivers](/en/machines/serial-driver/).

### 3. App settings

**Settings → Roasting machines → Add**, then:

| Field | Notes |
|-------|-------|
| Preset | Modbus RTU |
| Serial port | `COM3` (Win) / `cu.usbserial-*` (Mac) |
| Baud rate | Often 9600 or 19200 (check manual) |
| Slave ID | Controller address (often 1) |
| BT / ET registers | Holding/Input address + scale |

### 4. Verify

Live BT, ET, and RoR updating means success. Zeros or wild scale → fix register address or scale (e.g. ÷10).

## Modbus TCP (LAN)

### 1. Network

- Find the roaster IP (panel, maker utility, or DHCP list).
- Keep PC and roaster on the **same subnet**; prefer static IP or DHCP reservation.

### 2. App settings

| Field | Notes |
|-------|-------|
| Preset | Modbus TCP |
| Host | Roaster IP (e.g. `192.168.1.50`) |
| Port | Default `502` |
| Slave ID | Per equipment docs |
| Register map | BT/ET/gas/air channels |

### 3. Firewall

Allow outbound port 502 on Windows Firewall and site routers.

## Delta / Autonics

Many drum/half-hot-air roasters use **Delta** controllers over Modbus RTU.

1. Confirm baud, 8N1, Slave ID on the controller.
2. Find **PV registers** for BT/ET thermocouple channels in the manual.
3. Enter the same values in First Crack.

Autonics TK series follows the same RTU flow; default addresses differ by maker—prefer the manual.

## Probat / Giesen

- **Probat:** Set IP and Modbus map per HMI or maker guide. Type 2 vs Type 3 maps differ.
- **Giesen WxA:** Configure a fixed IP, then TCP. Prefer wired LAN over Wi‑Fi bridges.

Need model-specific maps? Tell us the model via [Contact](/en/support/contact/).

## Copy from Artisan

If Artisan **Config → Machine** already has Modbus, copy port/IP/slave/registers into First Crack. → [Import Artisan settings](/en/machines/artisan/)
