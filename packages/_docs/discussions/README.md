# Discussions

> **Purpose:** align on the **overall picture** and each **major point** before any planning or implementation. These are comprehension + agreement documents, not specs and not task lists.
>
> **Status:** Open (2026-06-10). Read [`00-overview.md`](./00-overview.md) first. Opinionation track: sessions **1–6** complete; **do session 7 next** — [`10-opinionation-roadmap.md`](./10-opinionation-roadmap.md).

Each discussion follows the same shape:

- **Shared understanding** — what we currently believe is true.
- **Points to confirm** — statements to explicitly agree or disagree on.
- **Open questions** — unresolved, to revisit when we move to details.

These map 1:1 onto the [compartment map](../reference/compartments.md). When a point is settled, the agreement graduates into a dated **Decision** block in the relevant `reference/` or phase `decisions.md` doc — not here.

## Index

| # | Discussion | Major point |
|---|---|---|
| 00 | [overview](./00-overview.md) | The overall picture — how the pieces fit |
| 01 | [codegen](./01-codegen.md) | YAML → generated artifacts |
| 02 | [identity-and-permissions](./02-identity-and-permissions.md) | Users, roles, manifest |
| 03 | [approval](./03-approval.md) | Submit / accept / reject |
| 04 | [runtime-dal](./04-runtime-dal.md) | Request handling + enforcement |
| 05 | [audit](./05-audit.md) | Immutable record + restore |
| 06 | [ui-sync](./06-ui-sync.md) | Rendering from the manifest |
| 07 | [template-scaffold](./07-template-scaffold.md) | Reusable business-app template |
| 08 | [ai-authored-surfaces](./08-ai-authored-surfaces.md) | AI-assisted surface authoring |
| 09 | [role-delegation-and-scope](./09-role-delegation-and-scope.md) | Non-`iam_master` role assignment + scope line |

### Platform opinionation track (2026-06-10)

Sequential — complete each session before the next. Master checklist: [`10-opinionation-roadmap.md`](./10-opinionation-roadmap.md).

| # | Discussion | Session focus |
|---|---|---|
| 10 | [opinionation-roadmap](./10-opinionation-roadmap.md) | **Start here** — ordered sessions 1–9 |
| 11 | [spine-adapters-skin](./11-spine-adapters-skin.md) | Taxonomy + spine lock + adapter catalog drafts |
| 12 | [audit-opinionation](./12-audit-opinionation.md) | `@latch/audit` spine vs adapter split |

## Related

- [`../reference/compartments.md`](../reference/compartments.md) — file-level map of each point
- [`../foundations/scope.md`](../foundations/scope.md) — v1 in/out (these discussions must not silently expand scope)
