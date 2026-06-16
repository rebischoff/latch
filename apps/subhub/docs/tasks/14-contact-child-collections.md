# 14 — Contact child collections

> **Status:** Complete (2026-06-13). Next: [15-entity-flow.md](./15-entity-flow.md).

## Goal

Phones and emails as logical Fields on `contact_detail` — DAL replace semantics + RHF `useFieldArray`.

## Prerequisites

[13-contact-ui.md](./13-contact-ui.md) complete.

## Files

| File | Action |
|------|--------|
| `lib/contacts/repository.ts` | `loadPartyPhones`, `replacePartyPhones`, emails |
| `lib/contacts/descriptors.ts` | Project + patch array fields |
| `components/contacts/PhoneEmailFields.tsx` | **Create** |
| `docs/child-collections.md` | Update with any deviations |

## Steps

1. Implement full pattern in [child-collections.md](../child-collections.md).
2. `get`: include `phones`/`emails` arrays when field `read` granted.
3. `patch`: transactional replace for each writable array field.
4. UI: `useFieldArray`; add/remove behind `<Can action="write">`.
5. Audit snapshots include child rows when audit mode requires.
6. Strict Zod: reject unknown keys on array elements.

## Verify (stop gate)

- [x] Add/edit/remove phone; save; reload shows persisted state
- [x] Read-only role sees phones as static text, no add button
- [x] Field omitted entirely when no `read` on `phones`
- [x] Slice 1 exit: customer list + contact detail with collections works
- [x] [`../../STATUS.md`](../../STATUS.md) → Slice 2 tasks **15**–**17** ([01-task-index.md](./01-task-index.md#slice-02--sites))

## Out of scope

- Sites slice
- Latch upstream collection codegen (log L2 if still painful)

## Reference

- [child-collections.md](../child-collections.md)
- [latch-feedback.md](../latch-feedback.md) — L2
