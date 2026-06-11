# 01 — Task index (read once)

## Goal

Orient the Step 3 task chain. **Do not implement code in this file.**

## Prerequisites

Skim [`../../step-3-pilot-surface.md`](../../step-3-pilot-surface.md).

## Execution order

```
00-decisions (docs)
  → 02-contracts → 03-policy → 04-db-schema → 05-audit-skeleton
  → 06-surface-yaml → 07-policies-yaml → 08-codegen
  → 09-dal-read → 10-dal-write → 11-dal-soft-delete → 12-dal-contract-tests
  → 13-api-route → 14-server-action → 15-stub-principal → 16-job-detail-page
  → 17-audit-triggers → 18-approval-minimal → 19-react-gates
  → 20-e2e-job-detail → 21-threat-tests
```

## Dependency diagram

```mermaid
flowchart TD
  d00[00 decisions] --> d02[02 contracts]
  d02 --> d03[03 policy]
  d03 --> d04[04 db]
  d04 --> d05[05 audit]
  d05 --> d06[06 surface yaml]
  d06 --> d07[07 policies yaml]
  d07 --> d08[08 codegen]
  d08 --> d09[09 dal read]
  d09 --> d10[10 dal write]
  d10 --> d11[11 soft delete]
  d11 --> d12[12 dal tests]
  d12 --> d13[13 api]
  d13 --> d14[14 action]
  d14 --> d15[15 stub auth]
  d15 --> d16[16 page]
  d16 --> d17[17 audit triggers]
  d17 --> d18[18 approval]
  d18 --> d19[19 react]
  d19 --> d20[20 e2e]
  d20 --> d21[21 threat]
```

## Full table

See [`../../step-3-pilot-surface.md`](../../step-3-pilot-surface.md#task-order).

## Verify (stop gate)

- [ ] You know which file [`STATUS.md`](../../../../../STATUS.md) points to as **Execute now**
- [ ] You will update **STATUS** after each task's Verify section passes

## Out of scope

Implementation work — use tasks 02–21.
