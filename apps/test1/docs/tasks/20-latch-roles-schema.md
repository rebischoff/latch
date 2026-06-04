# 20 — `latch_roles` schema

> **Status:** Planning stub — not scheduled. Expand when YAML policy phase (tasks **10–12**) is complete.

## Goal

Introduce persisted role **definitions** — CRM v1 had role ids in YAML only; test1 stores them in Postgres.

## Delivers

- Migration: `latch_roles` (`id`, `display_name`, `kind`: `system` | `custom`)
- Seed `iam_master`, `data_master` as `kind: system`
- `latch_user_roles.role_id` FK → `latch_roles.id`
- Update [../DATABASE.md](../DATABASE.md)

## Reference

- [../decisions.md](../decisions.md) § DB-backed RBAC
- [../PLAN.md](../PLAN.md) § Roles vision

## Prerequisites

- Tasks **10–12** complete (understand YAML policy before DB grants).
