---
title: Machine connection overview
description: How to connect machines in First Crack and which protocols we support
---

Connection steps depend on **model and protocol**. First Crack supports three paths:

| Method | Typical cases | Docs |
|--------|---------------|------|
| **Modbus RTU/TCP** | Delta/Autonics controllers, Probat, Giesen, gas drum roasters | [Modbus](/en/machines/modbus/) |
| **Phidget22** | Diedrich, Phidget temperature boards | [Phidget](/en/machines/phidget/) |
| **Artisan settings** | Machines already linked in Artisan | [Import Artisan settings](/en/machines/artisan/) |

:::tip[Artisan / Cropster compatible]
If a model works with Artisan or Cropster, First Crack usually works with the same communication settings.
:::

## Common flow

1. Sign in to the desktop app.
2. **Machines → Add Machine**.
3. Enter alias, batch capacity, and preset (Modbus / Phidget / other).
4. Set port, IP, slave ID, register map, etc.
5. Click **Connect** and confirm live BT/ET.

## Checklists by path

### USB serial (Modbus RTU)

- [ ] USB cable from roaster to PC
- [ ] Correct [USB–serial driver](/en/machines/serial-driver/) for your OS
- [ ] Correct COM port (Windows) / `/dev/tty.*` (macOS) in the app
- [ ] Baud, parity, slave ID match the roaster manual

### LAN / Wi‑Fi (Modbus TCP)

- [ ] Roaster and PC on the same network
- [ ] Static IP or DHCP reservation for the roaster
- [ ] Firewall/router allows Modbus port (default 502)
- [ ] Update app IP if the roaster IP changes

### Phidget

- [ ] [Phidget22 drivers](/en/machines/phidget/) and Network Server running
- [ ] Sensors visible in Control Panel
- [ ] Phidget preset + channel mapping in the app

## Unknown model

Send [Contact](/en/support/contact/):

- Roaster make & model
- Artisan **machine settings** screenshot if any (→ [Artisan guide](/en/machines/artisan/))
- Temperature controller brand (Delta, Autonics, etc.)
- USB vs LAN

## When things fail

See [Connection troubleshooting](/en/machines/troubleshooting/) first.
