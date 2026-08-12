---
title: Machine control
description: Heater · fan · drum setpoints and Auto Heat (PID) on Active Roast — Pro+
---

**Machine control** lets you drive **heater · fan · drum** setpoints from the Active Roast screen. On supported machines you can also use **Auto Heat (PID)** to hold a target bean temperature (BT).

:::note[Plan]
Available on **Pro+** and **Enterprise** only (including internal `team` / `tester`). Pro, trial, and Free hide the control panel. → [Plans](/en/service/plans/)
:::

## Prerequisites

1. Pro+ or higher
2. [Machine connected](/en/machines/) — sidecar online with live temperatures
3. The model must report **writable control** channels  
   (read-only temperature links will hide the panel or mark channels N/A)

## Using it on Active Roast

1. Start a roast session and connect the machine.
2. Expand the **Machine Control** panel next to the chart.
3. Drag the vertical faders:
   - **Heater** — heat power
   - **Fan** — airflow
   - **Drum** — drum speed
4. On release (or after keyboard adjust), the command goes to the sidecar. If the machine does not follow, a warning appears.

### Unsupported channels

All three slots (**Heater / Fan / Drum**) always stay visible.  
Unsupported channels are **disabled**, show value `—`, and label **N/A** so the layout does not jump between models.

### Auto Heat (PID)

- Shown only when the model supports PID (heater write map + gains).
- Enable **Hold BT at target** so software PID owns heat and tracks the SV.
- While PID is running/holding, the Heater fader locks with **PID** (avoids fighting the controller).
- On drop / session end, heat is held or zeroed per your drop behavior setting.

## Support scope

- Writability depends on the **model and register/capability map**. Read-only links cannot control.
- Connection guides: [overview](/en/machines/), [Modbus](/en/machines/modbus/), [Phidget](/en/machines/phidget/).
- If channels look wrong for your roaster, [contact us](/en/support/contact/) with make, model, and protocol.

## Troubleshooting

| Symptom | Check |
|---------|--------|
| No control panel | Plan (Pro+), connection, writable status |
| All channels N/A | Preset has no write map — likely read-only |
| Setpoint does not move the machine | Remote control allowed on the roaster, interlocks, local-mode panel |
| No PID block | Model without heater write + PID gains |
| “Device did not apply the command” | Disconnect, write reject, out of range — check sidecar/machine |

For connection failures, start with [troubleshooting](/en/machines/troubleshooting/).
