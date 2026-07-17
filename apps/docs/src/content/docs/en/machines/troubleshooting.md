---
title: Connection troubleshooting
description: Steps when roaster connect fails or temperatures look wrong
---

## Fresh install on a new PC

Machine settings are stored **on that PC**. On a new computer:

- [ ] Sign in with the same account
- [ ] Reinstall USB drivers / Phidget Network Server
- [ ] Re-add machine: serial port, IP, slave ID
- [ ] Re-enter capacity and other machine metadata

## USB serial roasters

1. **Settings → Roasting machines** → select machine → **Connect**
2. Confirm **serial port** (COM can change after replug)
3. Baud, slave ID, register addresses match the manual
4. Empty port list → [Serial drivers](/en/machines/serial-driver/)
5. Still failing → test on **another PC**
6. Fails everywhere → cable, hub, roaster hardware → maker support

## LAN (Modbus TCP)

1. Same **network** for roaster and PC
2. Did the roaster **IP change**? Update the app
3. `ping <roaster IP>` if allowed by policy
4. Port **502** blocked by firewall/router?
5. Giesen/Probat need maker network setup first
6. Fails on other PCs → roaster, switch, cables

## Phidget

1. **Phidget Control Panel** → Network Server **Running**
2. Devices tab shows live temperature
3. App channel map matches Control Panel
4. Re-read [Phidget setup](/en/machines/phidget/)

## Live temps look wrong

| Symptom | Check |
|---------|-------|
| Always 0 | Wrong register / slave ID |
| 10× or 0.1× | Scale factor (÷10, ÷100) |
| BT/ET swapped | Swap channel mapping |
| Dropouts / spikes | USB cable, RS485 termination, power noise |

If Artisan is fine, compare values 1:1 with [Artisan settings](/en/machines/artisan/).

## App & sync

- **Login fails:** Confirm the same account works on the web
- **Profiles missing:** Wait for sync on a good network, or restart the app
- **Subscription not recognized:** Check Pro on the [account page](https://firstcrackiscoming.com/account)

## Still stuck

Email [Contact](/en/support/contact/) with:

- OS and app version
- Roaster make & model
- Path (USB / LAN / Phidget)
- Error screenshots
- Artisan settings capture if any
