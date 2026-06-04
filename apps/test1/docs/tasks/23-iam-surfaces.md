# 23 — IAM Surfaces (`user`, `role`)

> **Status:** Planning stub — not scheduled. Expand when task **22** is complete.

## Goal

IAM admin UI: list/detail pages for users (role assignment) and roles (grant matrix editing) — `iam_master` only.

## Delivers

- Surfaces `user` and `role` (`kind: iam` in registry)
- `/iam/users`, `/iam/roles` split views
- Nav entries for IAM routes when permitted
- PATCH role grants + user assignments via DAL; audit rows
- Self-patch denied on own user (mirror CRM IAM rule)

## Reference

- CRM IAM (API only): [`apps/crm/modules/iam/`](../../../crm/modules/iam/), [`apps/crm/src/lib/iam/`](../../../crm/src/lib/iam/)
- [../LAYOUT.md](../LAYOUT.md) § IAM routes

## Prerequisites

- Task **22** complete.
