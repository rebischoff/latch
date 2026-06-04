# 10 — First business Surface (`contact`)

> **Status:** Planning stub — not scheduled. Expand steps and verify gate when task **05** is complete.

## Goal

End-to-end Latch loop on the simplest domain: `contact` Surface with `list` and `detail` **modes**, YAML policies, codegen, DAL, split page.

## Delivers

- `modules/contact/contact.surface.yaml` + `.policies.yaml`
- Codegen → `generated/contact.schema.generated.ts`
- `src/lib/contacts/` descriptor + repository
- `/contacts` split view with `<FieldControl>`
- Two seed roles with different Field visibility (YAML policies)

## Reference

- [../PLAN.md](../PLAN.md) § Surfaces
- CRM: [`apps/crm/modules/customer/`](../../../crm/modules/customer/), [`apps/crm/src/lib/customers/`](../../../crm/src/lib/customers/)

## Prerequisites

- Tasks **02–05** complete.

## Note

Use unified Surface id `contact` with `PolicyScope.mode` — do not create `contact_list` / `contact_detail` policy surfaces.
