# 21 — Grant tables

> **Status:** Planning stub — not scheduled. Expand when task **20** is complete.

## Goal

Store per-Surface and per-Field grants in Postgres (`latch_role_grants`; optional `latch_role_row_scope`).

## Delivers

- Normalized grant schema (lock shape in [../decisions.md](../decisions.md) Open items before coding)
- Seed grants for system roles + one custom role
- `policyVersion` bump on grant CRUD

## Reference

- [../DATABASE.md](../DATABASE.md) table sketch
- CRM policies YAML as semantic reference: [`apps/crm/modules/job/job_detail.policies.yaml`](../../../crm/modules/job/job_detail.policies.yaml)

## Prerequisites

- Task **20** complete.
