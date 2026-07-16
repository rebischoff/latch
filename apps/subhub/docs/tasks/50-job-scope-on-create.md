# 50 — Job Scope editable on create (estimate parity)

> **Status:** Complete (2026-07-15). Next: [49 — Change-order Surfaces (5d)](./49-change-order-surfaces.md).
>
> **Depends on:** [47](./47-job-line-items-parity.md), [48](./48-job-create-front-doors-condition-drift.md). **Companion:** [`estimate.md`](../surface-specs/estimate.md) create nested collections.
>
> **Parked follow-on:** Blank Jobs New still cannot **Add condition** (SW0) — see [planning/17-service-warranty-tm-open.md](../planning/17-service-warranty-tm-open.md).

**Out of scope:** Field tab / 5c progress; change-order Surfaces (**49**); sold-$ editing on job.

---

## Locked summary

| # | Choice |
|---|--------|
| **JSC-1** | Jobs → New → pick site → **Scope editable before first Save** (estimate Line Items parity) |
| **JSC-2** | One Save POSTs `profile` + optional `conditions` / `line_items` (whole-job surface model) |
| **JSC-3** | Field tab stays “Save the job first…” stub until 5c |
| **JSC-4** | Site warn-and-clear clears **conditions + line_items** (client + server) |

---

## Goal

Close the create UX gap: Scope was stubbed with “Save the job first…” while estimates allow Line Items on create after site pick.

**Exit:** Create schema + DAL + UI match estimate nested write; tests + STATUS.

---

## Step 1 — Create schema + DAL

| File / area | Action |
|-------------|--------|
| `lib/jobs/descriptors/job-detail.ts` | `JobDetailCreateSchema` accepts optional `conditions` / `line_items` |
| `lib/jobs/stores/job-detail-create.ts` | Pass collections into `insertJob`; audit field ids |
| `lib/jobs/repository/job-write.ts` | `insertJob` → `replaceJobCollectionsTx`; `updateJob` site change clears conditions + lines |

### Verify

- [x] POST create accepts nested conditions/lines
- [x] Collections written in same TX as job header insert
- [x] Site change on PATCH clears conditions + lines server-side

---

## Step 2 — UI

| File / area | Action |
|-------------|--------|
| `components/jobs/JobDetailForm.tsx` | Scope tab gated on `siteId` (not `isCreate`); persist sends collections on create |
| | Site change confirm clears conditions + line_items |

### Verify

- [x] Jobs → New → pick site → Scope panels render
- [x] First Save persists scope structure
- [x] Field tab still stubbed on create

---

## Step 3 — Tests + docs

| File | Action |
|------|--------|
| `lib/jobs/descriptors/job-detail-create.test.ts` | Create schema accepts collections |
| `docs/surface-specs/job.md` | `create` documents optional collections; Scope on create when site set |
| `01-task-index.md` / `STATUS.md` | 50 complete; Right now → **49** |

### Verify

- [x] Tests green
- [x] Task + indexes + STATUS updated

---

## Related

- [47 — Job LI parity](./47-job-line-items-parity.md)
- [48 — Job create front doors](./48-job-create-front-doors-condition-drift.md)
- [49 — CO Surfaces](./49-change-order-surfaces.md)
