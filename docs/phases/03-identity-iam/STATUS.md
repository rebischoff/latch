# STATUS — Phase 03 Identity & IAM

> Phase-local quarterback. Global pointer: [`../../../STATUS.md`](../../../STATUS.md).
> Updated: 2026-05-29.

- **Home packages:** `@latch/policy` (+ possible `@latch/iam`)
- **State:** not started

## Right now — do this next

Not active. Entry point when picked up: lock the built-in role catalog and the **Data master auto-access** mechanism in [`decisions.md`](./decisions.md), then design `latch_user_roles` + seeds.

## Blockers

- **D2 (auth provider)** is still open ([`../../foundations/open-questions.md`](../../foundations/open-questions.md)). DB-backed roles can land before the provider via the stub fallback.

## Recently completed

- Nothing yet. Today: stub principal (`LATCH_STUB_USER` / `LATCH_STUB_ROLE`), `latch_users` table exists.
