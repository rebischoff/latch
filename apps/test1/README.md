# test1 — Latch learning harness

> **Docs-first.** No application code until tasks under [`docs/tasks/`](./docs/tasks/) say otherwise.

`apps/test1` is a **second consumer app** for learning how Latch works end-to-end. You build it step by step; [`apps/crm`](../crm/) remains the reference implementation.

**Start here:** [`docs/STATUS.md`](./docs/STATUS.md)

## How test1 differs from CRM

| Topic | CRM | test1 |
|-------|-----|-------|
| Purpose | Platform proof harness | Learning by building |
| Auth | Auth.js (NextAuth v5) | [Better Auth](https://better-auth.com/) |
| Surface ids | Transitional split (`job_list` / `job_detail`) | **Unified** Surface + `mode` (`list` \| `detail`) |
| Role policies | Repo YAML only | **Target:** Postgres-persisted roles + grants (tasks 20–23) |
| IAM UI | API only | Full IAM Surfaces (`user`, `role`) with pages |

## Scope override

[`docs/foundations/scope.md`](../../docs/foundations/scope.md) defers a second runnable consumer app. test1 is an **explicit learning exception** — documented in [`docs/decisions.md`](./docs/decisions.md).

## Doc map

| Doc | Purpose |
|-----|---------|
| [`docs/STATUS.md`](./docs/STATUS.md) | What to do next |
| [`docs/PLAN.md`](./docs/PLAN.md) | Goals, Surfaces, anti-scope-creep |
| [`docs/decisions.md`](./docs/decisions.md) | Locked choices |
| [`docs/CONFIG.md`](./docs/CONFIG.md) | Per-app env (`apps/test1/.env.local`) |
| [`docs/tasks/`](./docs/tasks/) | Executable task chain |
