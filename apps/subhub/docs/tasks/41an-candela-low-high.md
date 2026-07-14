# 41an — Candela Low/High enum (data + seeds)

> **Status:** Complete (2026-07-13). Next: [41ao](./41ao-drop-threshold-presets.md) (deferred — preset teardown + number popover).

## Problem

Candela was modeled as cd switch positions (15…185) with High/Low threshold presets. UI still showed individual ratings after a failed partial build. Estimators need **Low | High** capability class only.

## Goal

Replace Candela options with **Low** | **High** only. Wipe old Candela buckets, presets, and part rows. Seed **Low** on parts linked to `Horn/Strobe`, `Speaker/Strobe`, or `Strobe` leaves.

**Decision:** [Candela Low/High](../decisions/catalog.md#decision-candela-lowhigh-enum-2026-07-13).

**Not in scope:** threshold-preset system teardown; estimate number popover ([41ao](./41ao-drop-threshold-presets.md)).

---

## Implementation

| File | Change |
|------|--------|
| `migrations/062_candela_threshold_presets_seed.sql` | Candela options Low/High only; remove Candela preset seed |
| `migrations/065_system_sensor_av_candela_specs.sql` | Horn/strobe MPNs → Candela Low only |
| `migrations/066_system_sensor_notification_white_lf_seed.sql` | White horn/strobes → Candela Low only |
| `migrations/068_system_sensor_mount_catalog_fix.sql` | Drop cd fix/arrays; ceiling/outdoor horn/strobes → Low |
| `migrations/070_candela_low_high.sql` | Forward rewrite for already-migrated DBs |
| `docs/surface-specs/item.md` | Candela DTO example Low/High |
| `lib/catalog/spec-match.test.ts` | Candela High/Low option membership (no preset) |

---

## Verify (stop gate)

- [x] Scope Specs → Candela shows Low / High only (no 15/30/…)
- [x] Part Specs → horn/strobe MPNs show Candela = Low
- [x] Estimate C → Candela Select with allowClear
- [x] Part picker narrows on Candela Low / High
- [x] Unit tests updated
- [x] STATUS updated (41ao deferred)
