# 05 — Audit mode (config + DAL gate + scaffold flag)

> **Status:** Complete (2026-06-11). Next: [06-adapter-better-auth.md](./06-adapter-better-auth.md).

## Goal

Make scaffold-time audit modes real end-to-end: migration + DAL gate + `latch new --audit-mode`. (Slice 9.4.) Modes per [`12-audit-opinionation.md`](../../../discussions/12-audit-opinionation.md): `full` / `standard` / `recovery`, runtime-immutable, upgrade-only.

## Prerequisites

- [`../decisions.md`](../decisions.md) `latch_app_config` shape locked (default: single-row typed table).

## Files

| File | Action |
|------|--------|
| `packages/codegen/template/migrations/0NN_latch_app_config.sql` (new) | Platform config row incl. `audit_mode` |
| `packages/codegen/template/migrations/011_latch_pending_changes.sql` (new) | Approval staging table (platform core; may land here) |
| `@latch/dal` (or audit write path) | Read `audit_mode`; shape insert/update/delete payloads per mode table |
| `@latch/codegen` scaffold (`latch new`) | `--audit-mode=full|standard|recovery` (default `full`); seed config row |
| tests | Mode payload behavior per row; threat/compartment coverage; upgrade-only documented |

## Mode payload (from session 6.6)

| Mode | insert | update | delete |
|------|--------|--------|--------|
| `full` | `after` | before/after + patch | `before` |
| `standard` | metadata only | before/after + patch | `before` |
| `recovery` | none | none | `before` |

## Verify (stop gate)

- [x] `latch_app_config` + `011_latch_pending_changes` migrations ship in the template chain.
- [x] DAL writes match the mode table for all three modes (tested).
- [x] `latch new --audit-mode=standard` seeds the config row; default is `full`.
- [x] Runtime immutability + upgrade-only path documented (no UI toggle).
- [x] `npm run test` / `build` green; [`../STATUS.md`](../STATUS.md) → `06-adapter-better-auth.md`.

## Out of scope

- Operator downgrade break-glass script (documented, out of band); retention automation.
