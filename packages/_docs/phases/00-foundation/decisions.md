# Phase 00 — decisions

Phase-scoped decisions. Cross-cutting locked decisions live in [`../../foundations/`](../../../../docs/foundations) (see `open-questions.md` "Resolved" table).

## Decided (delivered)

| Date | Topic | Choice |
|------|-------|--------|
| 2026-05-28 | Role merge (v1) | `union_grants` only, global `denyWins: true` |
| 2026-05-28 | Enforcement | DAL-only in v1 (RLS deferred to Phase 06) |
| 2026-05-28 | Metadata source | Surface + policy bindings in repo YAML; codegen for structure |

## Open / to lock

- [ ] Explicit `create` action in the action vocabulary (currently `read`/`write`/`delete`/`approve`/`submit`/…). Decide Surface-level vs Field-level. *(Carried from planning chat.)*
