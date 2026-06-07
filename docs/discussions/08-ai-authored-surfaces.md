# Discussion 08 — AI-authored surfaces

> **Status:** Open / Ambition (2026-06-05). The most forward-looking point. Depends on [01 codegen](./01-codegen.md), [02 permissions](./02-identity-and-permissions.md), and [07 template](./07-template-scaffold.md).

## Shared understanding

- The ambition: an end user (or operator) **adds/updates/deletes surfaces** with AI assistance — e.g. "build me a trades-service app with contacts and jobs."
- The current architecture is **well-suited** to this *precisely because* of the metadata indirection that otherwise feels heavy:
  - AI emits **constrained, validatable YAML** (surface + policies) and a migration — **not** arbitrary TypeScript or SQL it invents freely.
  - A **validation gate** (`codegen --check` + Zod + migration review) rejects malformed AI output before runtime.
  - The **kernel enforces invariants** (strict writes, forbidden-field omission, audit) regardless of what the AI authored — bounded blast radius.
- This is **"expose the authoring artifacts to an AI behind a gate,"** not a new architecture.

## Points to confirm

1. AI authors **declarative artifacts** (YAML + migrations), never enforcement logic or ad-hoc SQL.
2. A **validation/approval gate** is mandatory between AI output and applying changes.
3. Runtime safety does **not** depend on the AI being correct — the kernel still enforces.
4. This ambition is a **reason to keep** the YAML/codegen/kernel split, not remove it.

## Open questions

- Who is the author — **developer-assist** (AI helps us write surfaces) first, or **end-user self-service** eventually? Different guardrails.
- How are AI-proposed **migrations** reviewed/applied safely (especially destructive changes)?
- How do we constrain the AI to the **allowed YAML schema** (JSON schema + examples + the validation gate)?
- What's the smallest first proof — e.g. AI generates a single contact surface end-to-end behind the gate?

## Related

- [`07-template-scaffold.md`](./07-template-scaffold.md), [`01-codegen.md`](./01-codegen.md), [`../reference/compartments.md`](../reference/compartments.md)
