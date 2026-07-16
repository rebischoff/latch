# Service / warranty / T&M — open discussion (parked)

> **Status:** **Open — parked** (2026-07-15). Not locked. Do **not** implement product choices from this doc until a decision session closes the forks below.  
> **Keeps (already locked):** [JC1–JC2](../decisions/job.md#decision-estimate--job--co-commercial-boundaries-2026-07-15) — as-sold via estimate Win; Jobs → New for service / warranty / blank shells; [engagements `job_kind`](../decisions/job.md#decision-engagements--job_kind-2026-06-17).  
> **Companion:** [16-estimate-job-co-boundaries.md](./16-estimate-job-co-boundaries.md), [05-billing.md](./05-billing.md) (`billing_model = tm`).

## Why this doc exists

After Job Scope became editable on create ([50](../tasks/50-job-scope-on-create.md)), product walked Jobs → New and raised service / warranty / T&M questions that **JC1–JC7 do not answer**. Pin the agenda here so **49** (CO Surfaces) and **5c** (Field) stay unblocked, and so blank-job Scope UX is not mistaken for a finished ticket model.

---

## Already locked (do not re-litigate)

| # | Choice |
|---|--------|
| **JC1** | Sold / as-sold contract → rebuild **estimate** → **Win**. No sold-$ editor on Job Scope. |
| **JC2** | **Keep** Jobs → New for `service` / `warranty` / blank `project` (`estimate_id` null; Scope-E1 sold $0). Sold contract lines only via Win / Create-job / later CO approve. |
| **Engagements** | One `job` table; `job_kind` ∈ `project` \| `service` \| `warranty`; same child tables — **no parallel ticket schema in v1**. |

Front-door sketch (from [16](./16-estimate-job-co-boundaries.md)):

```text
Sold / contracted project
  └─ Estimate ──Win──► Job (sold_* frozen)

Service / warranty / blank project shell
  └─ Jobs → New ──► Job (estimate_id null; Scope @ sold $0)

Contract change on live job
  └─ Change order ──Approve──► job_line void / add / revise
```

---

## Observed gap (implementation, not product fork)

| ID | Finding | Notes |
|----|---------|--------|
| **SW0** | Blank Jobs → New → Scope: **Add line** disabled; **Config** empty | Job Scope has **no Add condition** UI. Empty state still says conditions are “copied from the estimate on win.” Create path ([50](../tasks/50-job-scope-on-create.md)) unstubs the tab; **manual condition forest** for `estimate_id` null jobs is still missing. Treat as Scope-U1 completeness for Jobs New — separate from T&M/ticket product locks. |

---

## Open forks (need discussion)

### SW1 — Service with a contract amount

| Question | Options to discuss |
|----------|-------------------|
| Fixed price / NTE service | Estimate → Win (JC1)? Jobs New + later CO? Quote-lite on job? |
| Does “service” ever plant `sold_*` without an estimate? | JC2 today says **no** sold contract from Jobs New |

### SW2 — T&M (estimates and jobs)

| Question | Options to discuss |
|----------|-------------------|
| Where is T&M authored? | Estimate with `tm` intent? Job-only (`billing_model = tm`)? Both? |
| What is “sold” on T&M? | Rates only? NTE cap as sold $? Hours/materials as billables with sold $0 lines? |
| Relation to Scope-E1 | Jobs New already plants engineering @ sold $0 — is that enough until wave **6b** billing? |
| Schema already has | `job.billing_model` includes `tm` ([05-billing](./05-billing.md)); billable auto-gen deferred (B4) |

**Session needed:** end-to-end T&M story across estimate → job → billable → invoice. Do not invent UI until locked.

### SW3 — Warranty

| Question | Options to discuss |
|----------|-------------------|
| Confirm | No customer contract $ (fits JC2 sold $0) |
| `parent_job_id` | When required? UI on create vs PATCH only? |
| Scope | Same Scope-E1 lines + site zones, or warranty-specific defaults? |

### SW4 — Service / warranty as “tickets”

Engagements already say tickets **share** job machinery. Still open:

| Question | Options to discuss |
|----------|-------------------|
| Issue / symptom / resolution | Profile fields? `notes`? Separate ticket entity (rejected for v1 parallel schema — revisit?) |
| Scope of work | Normal conditions + lines? One “service call” condition pattern? |
| Geography | Reuse existing `site_zone` / `site_asset` — yes as default? |
| Catalog | Special leaf item(s) for labor/trip/diagnosis? Free-text description-only lines? |

### SW5 — When operators must use estimates

| Intent | Path (locked or open) |
|--------|------------------------|
| Sold install / contracted project | **Locked:** estimate → Win (JC1) |
| Blank engineering shell | **Locked:** Jobs → New (JC2) |
| Service / warranty ticket | **Locked front door:** Jobs → New; **open:** ticket fields + T&M (SW1–SW4) |
| Service sold as fixed/NTE before work | **Open:** SW1 |

---

## Suggested decision-session agenda

1. **SW0** — Ship Add-condition (estimate-parity) on Job Scope for blank jobs? (likely yes; small UX task — not blocked on SW1–SW4)  
2. **SW2** — Lock T&M commercial model (sold vs billable vs rates)  
3. **SW1** — Fixed/NTE service vs T&M service front doors  
4. **SW4** — Ticket capture fields + catalog conventions (keep single `job` table)  
5. **SW3** — Warranty defaults + `parent_job_id` UX  

**Out of this session:** CO Surfaces (**49**), Field progress (**5c**), billing invoice UI (wave 6b) — except where T&M forces a billing-model lock.

---

## Related

- [16-estimate-job-co-boundaries.md](./16-estimate-job-co-boundaries.md)  
- [decisions/job.md — JC1–JC7](../decisions/job.md#decision-estimate--job--co-commercial-boundaries-2026-07-15)  
- [decisions/job.md — engagements](../decisions/job.md#decision-engagements--job_kind-2026-06-17)  
- [05-billing.md](./05-billing.md)  
- [50 — Job Scope on create](../tasks/50-job-scope-on-create.md)  
