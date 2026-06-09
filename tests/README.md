# Root `tests/` — orphaned (CRM deleted)

These files imported `@latch/crm` and `apps/crm/*`. **`apps/crm` was removed**; they are **not** included in `vitest` (`npm test` scans `packages/**` and `apps/**` only).

**Active harness (P10, 2026-06-08):** IAM/threat assertions live under [`apps/spike_policy`](../apps/spike_policy/) — see [`lib/iam-user/threat-t8.test.ts`](../apps/spike_policy/lib/iam-user/threat-t8.test.ts) and sibling `*.test.ts` files.

**Full CRM-parity e2e** (jobs, customers, verification, restore, etc.) graduates with the business-app template — [discussion 07](../docs/discussions/07-template-scaffold.md).
