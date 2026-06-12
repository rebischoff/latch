# Platform status — where Latch stands

> **Living snapshot.** Update when a phase or package task chain closes. Global pointer: [`STATUS.md`](../../../STATUS.md). **Updated:** 2026-06-10.

## Summary

| Layer | State |
|-------|-------|
| **Phases 00–06** | Complete — three-Surface CRM proof, IAM, audit, verification, manifest cache |
| **Phase 08** | **Complete** (2026-06-10) — scoped row filter (`scopeIds` → DAL) + `apps/spike_business` proof |
| **Phase 09** | **Active (planned 2026-06-11)** — extract reference adapters into `@latch/*`; template zero-glue; fresh-start + scaffold proof |
| **Phase 07** | Deferred — multi-company, native RLS, package publish |
| **Spike policy console** | UI tasks complete; delegation proven in browser |

**Next executable step:** [Phase 09 task 00 — clean slate](../phases/09-platform-packaging/tasks/00-clean-slate.md) (after locking its gated decisions).

---

## Package matrix

| Package | v1 CRM proof | Scope primitive (2026-06-09) | Task doc | Notes |
|---------|--------------|------------------------------|----------|-------|
| `@latch/contracts` | Complete | Complete — seam (`scope`, `scopeIds`, bindings) | — | Types only |
| `@latch/policy` | Complete | **Complete** — scoped RLS + delegation | [`policy/docs/tasks`](../../policy/docs/tasks/README.md) | Task 05 closed 2026-06-10 |
| `@latch/dal` | Complete | **Complete** — `scope` row filter | [`dal/docs/tasks`](../../dal/docs/tasks/README.md) | dal 01 closed 2026-06-10 |
| `@latch/codegen` | Tasks 01–04 complete | N/A | [`codegen/docs/tasks`](../../codegen/docs/tasks/README.md) | DDL gen deferred |
| `@latch/audit` | Phase 04 complete | N/A | phases/04 | Biz triggers → Phase 07 |
| `@latch/approval` | Phase 05 complete | N/A | phases/05 | — |
| `@latch/react` | Phase 02 complete | N/A | phases/02 | — |

---

## `@latch/policy` — runtime roles checklist

| Task | Deliverable | State |
|------|-------------|-------|
| 01–04 | Role tables, provider, role editor, P10 harness | **Complete** |
| 05 Phase A | Contracts + DDL seam | **Complete** (2026-06-09) |
| 05 Phase C | Scoped delegation (spike app code) | **Complete** (2026-06-09) |
| [05b](../../policy/docs/tasks/05b-scoped-rls-resolve.md) | `resolve` → `scopeIds` | **Complete** (2026-06-10) |
| [dal 01](../../dal/docs/tasks/01-scoped-row-filter.md) | DAL `scope` filter | **Complete** (2026-06-10) |
| [05c](../../policy/docs/tasks/05c-policy-closeout.md) | Regression + task 05 close | **Complete** (2026-06-10) |

**Not blocking policy "complete":** P7 mode overlays, extra merge modes, native RLS, explicit deny authoring.

---

## Apps

| App | Role | State |
|-----|------|-------|
| `apps/spike_business` | Scoped row-filter proof harness | Phase 08 complete |
| `apps/crm` | Sole consumer + proof harness | Phases 01–06 proven |
| `apps/spike_policy` | Policy console spike | Tasks 01–08 complete |
| `apps/spike_codegen` | Codegen vocabulary fixture | Complete |

---

## Explicitly deferred (not on active queue)

From [`scope.md`](../foundations/scope.md) and Phase 07:

- Multi-company routing, Neon provisioning
- Native Postgres RLS (DAL scoped filter is Phase 08; RLS is Phase 07)
- `@latch/*` npm publish + external SDK consumer
- Per-scope differential field grants, ABAC/ReBAC
- Codegen: migration DDL gen, starter pages, `--check` cross-validation vs **migration DDL** (SQL-first, 2026-06-11; was Drizzle)

---

## Related

- [`packages.md`](./packages.md) — boundaries
- [`scope.md`](../foundations/scope.md) — v1 in/out
- [`phases/README.md`](../phases/README.md) — phase map
