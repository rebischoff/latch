# 05 — Nav manifest

## Goal

Sidebar shows only Surfaces the principal may access; includes IAM and future business entries.

## Prerequisites

[04-auth-entry.md](./04-auth-entry.md) complete.

## Files

| File | Action |
|------|--------|
| `lib/nav.ts` | **Create** — `surfaceId`, label, href, group, icon |
| `lib/nav-server.ts` | **Create** — filter nav by resolved manifests |
| `components/shell/SideNav.tsx` | **Create** — render grouped menu |

## Steps

1. Define static nav catalog (explicit hrefs — **not** dynamic `[surface]` pages):

   | surfaceId | href | group |
   |-----------|------|-------|
   | `user_list` | `/iam/users` | IAM |
   | `role_list` | `/iam/roles` | IAM |
   | `contact_list` | `/contacts` | Contacts |
   | … | … | … |

2. For each catalog entry, `resolveContext({ surfaceId, mode: 'list' })` (or `detail` for IAM) — include link only if manifest grants surface `read` or any field `read`.
3. Hide entire IAM group when no IAM surface visible.
4. Log **L4** in [latch-feedback.md](../latch-feedback.md) if nav metadata duplication hurts.

## Verify (stop gate)

- [ ] Admin sees IAM + placeholder business entries when granted
- [ ] User without IAM grants sees no IAM group
- [ ] Nav hrefs are explicit paths per [decisions.md](../decisions.md)
- [ ] [`../../STATUS.md`](../../STATUS.md) → [06-iam-surfaces.md](./06-iam-surfaces.md)

## Out of scope

- IAM page implementation
- `nav:` block in Surface YAML (Latch L4)
