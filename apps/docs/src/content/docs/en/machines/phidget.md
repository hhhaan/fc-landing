---
title: Phidget setup
description: Connect Diedrich and other Phidget22 temperature interfaces
---

Roasters that read BT/ET via Phidget22 boards (e.g. Diedrich) use the First Crack **Phidget** preset.

## 1. Install Phidget22

Install the Phidget22 runtime for your OS.

- **Windows:** [Phidget22-x64.exe](https://www.phidgets.com/downloads/phidget22/libraries/windows/Phidget22-x64.exe)
- **macOS:** [Phidget22.dmg](https://www.phidgets.com/downloads/phidget22/libraries/macos/Phidget22.dmg)

Then open **Phidget Control Panel**.

## 2. Network Server

First Crack needs the local Phidget Network Server running.

### Windows

1. Open **Phidget Control Panel**
2. **Network Server** tab
3. **Startup Type:** Automatic
4. Check **Enabled** → **Start**
5. Confirm status is **Running**

### macOS

1. Open **Phidget Control Panel** (Launchpad)
2. **Network Server** tab
3. Unlock with admin password
4. Enable **Start Automatically on Boot** and **Enabled**
5. Click **Start Network Server**

## 3. Confirm sensors

In Control Panel **Devices**, confirm the thermocouple interface (e.g. TMP1100, 1048) appears and temperatures update. If not: USB cable, board power, reinstall drivers.

## 4. First Crack settings

1. **Machines → Add**
2. Alias, model, batch size
3. Preset **Phidget**
4. Map BT/ET channels to device/channel numbers
5. Save and connect — live temps complete the setup

## Diedrich

Diedrich often uses Phidget temperature inputs. If Artisan already uses Phidget, reuse the same channel numbers.

## Troubleshooting

- **No temperature:** Network Server Running? Local firewall blocking?
- **Channel errors:** Control Panel channel numbers must match the app
- **Moved to a new PC:** Reinstall drivers and Network Server → [Troubleshooting](/en/machines/troubleshooting/)
