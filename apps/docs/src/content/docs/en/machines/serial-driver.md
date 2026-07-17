---
title: Serial port drivers
description: Install USB serial drivers when ports do not appear
---

For **USB–serial** links (Modbus RTU, etc.), First Crack’s port list stays empty until the OS has the right USB driver.

## Symptoms

- Empty serial port list in machine settings
- No new port when USB is plugged in
- “Cannot open port” on connect

## Windows

### 1. Device Manager

`Win + X` → **Device Manager** → **Ports (COM & LPT)** — look for `COMx`.

- **Unknown device** or yellow bang on **USB Serial** means missing drivers.

### 2. Install drivers

Follow the roaster or USB adapter maker. Common chipsets:

| Chipset | Driver |
|---------|--------|
| FTDI | [FTDI VCP](https://ftdichip.com/drivers/vcp-drivers/) |
| CH340 / CH341 | Maker site or [WCH](http://www.wch-ic.com/downloads/CH341SER_EXE.html) |
| CP210x | [Silicon Labs](https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers) |
| Prolific PL2303 | Maker package |

Prefer drivers shipped with the roaster.

### 3. COM number

After install, enter the **COM number** from Device Manager (e.g. COM5) in First Crack.

## macOS

1. Plug the adapter → **System Settings → General → About → System Report → USB**
2. Install maker macOS drivers if needed (newer macOS may ship built-ins)
3. In Terminal: `ls /dev/cu.*` for `cu.usbserial-*` or `cu.wchusbserial*`
4. Select that `/dev/cu....` port in First Crack

## Still stuck

1. Swap USB cable/port; avoid hubs (direct to PC)
2. Test the same cable on another PC
3. Check roaster Modbus port and “comm ON” settings
4. [Troubleshooting](/en/machines/troubleshooting/) and [Contact](/en/support/contact/)
