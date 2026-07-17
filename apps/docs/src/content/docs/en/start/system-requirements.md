---
title: System requirements
description: Minimum and recommended specs for the First Crack desktop app
---

First Crack is a **native desktop app** for the roast floor. Use the specs below for reliable live temperature graphs and machine I/O.

| OS | Minimum | Recommended |
|----|---------|-------------|
| **Windows** | Windows 10/11 64-bit, Intel Core i3-class, 4GB RAM | Windows 10/11 64-bit, Intel i5 or better, 8GB RAM |
| **macOS** | macOS 12.0 (Monterey) or later | macOS 12+ (Apple Silicon or Intel) |

## Network

- **Offline roasting:** Machine connection, live graphs, and local batch records work without internet.
- **Cloud sync:** Profile/batch upload and account auth need a network connection.
- **Modbus TCP:** Roaster and PC must be on the **same LAN**. Ensure the port (usually 502) is not blocked by router or firewall.

## Peripherals

- **USB serial:** You may need the USB–serial driver recommended by the roaster maker (FTDI, CH340, etc.). → [Serial port drivers](/en/machines/serial-driver/)
- **Phidget:** Install the Phidget22 runtime and Control Panel. → [Phidget setup](/en/machines/phidget/)

## Unsupported

- 32-bit Windows
- macOS 11 or earlier
- Linux (no official build yet — ask support for roadmap)
