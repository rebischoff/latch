# 05 — Manifest inspector (effective permissions)

> **Status:** Superseded (2026-06-08). **Folded into** [04 — Users UI + inspector](./04-users-ui.md).
>
> Do not implement as a separate task. The inspector is a **card on `/users/[id]`**, not its own route.

## Former goal (retained for reference)

Show read-only **effective permissions** for the **selected user**: one row per registered surface from `spikePolicyRegistry`, columns for `rowScope`, field actions, surface actions.

## Where to implement

All deliverables and verify gates now live under **[04 — Users UI](./04-users-ui.md)** (layout sketch, RHF integration, `resolveAllManifests`, multi-role merge proof, auto-refresh on save).

Inspector does **not** show per-row `policyVersion` — see [README policyVersion section](./README.md#policyversion--what-it-is-and-how-the-spike-shows-it) (global nav badge).
