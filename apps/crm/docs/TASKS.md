# CRM — task checklist (planning)

>
> Build order and timing follow [`../../../docs/reference/crm-and-phases.md`](../../../docs/reference/crm-and-phases.md). Phase 01 `dal.jobs.list` is merged — **Step B-list** (list pane) is unblocked.

## Conventions

- Ant Design only — **no Tailwind** (see [`LAYOUT.md`](./LAYOUT.md)).
- No `db.*` import outside `@latch/dal`.
- Mirror `apps/web` patterns (`lib/latch.ts`, `getPrincipal`) — duplicate thin, do not over-abstract yet.

## Planning gate

This checklist covers what is **already planned**. If a step reaches an unplanned fork (a Field/Surface not defined, an auth detail not in [`AUTH.md`](./AUTH.md), a DAL method not merged), **stop and plan first** per the [planning gate](../../../docs/phases/README.md#planning-gate-stop-and-plan-rule). Do not improvise the contract. A checkbox below being unchecked is permission to *build it as written*, not to invent missing design.

---

## Step A — App shell + stub auth

**Proves:** `@latch/policy` nav resolution; session boundary; AntD chrome.
**Depends on:** Phase 00 (done). No package work required.

- [x] Add `apps/crm` to root `package.json` `workspaces` (`apps/*` includes `apps/crm`).
- [x] `apps/crm/package.json` — Next 16.2.6, `antd`, `@ant-design/icons`, `react-hook-form`, `@latch/*` deps. No `tailwindcss`.
- [x] `app/layout.tsx` — `ConfigProvider` (default theme) + AntD `Layout` shell (header, sider, content). See [`LAYOUT.md`](./LAYOUT.md).
- [x] `lib/auth/` — cookie session helpers + `getPrincipal()` (see [`AUTH.md`](./AUTH.md)).
- [x] `app/login/page.tsx` — RHF login; Server Action → Auth.js `signIn("credentials")` (task 15).
- [x] Logout Server Action + header user dropdown.
- [x] Layout guard (`requireSession` in `(app)/layout`): unauthenticated → `/login`; `/login` + `/api/health` public. No `middleware.ts` / `proxy.ts`.
- [x] `lib/latch.ts` — `resolveContext` + DAL factory (mirror `apps/web`).
- [x] Nav: server-resolved menu, only routes the principal may open (no leaked Surface IDs).

**Verify (stop gate):**
- [x] Log in as `tech@demo.local` → see only permitted nav.
- [x] Log in as `admin@demo.local` → nav differs (Jobs + Customers vs tech Jobs-only; header label differs).
- [x] Logout returns to `/login`; protected route while logged out redirects.

---

## Step B-detail — `job_detail` pane (read → write → delete)

**Proves:** `@latch/dal` `get`/`patch`/`delete`, `@latch/react` `<FieldControl>`/`<Can>`, manifest field omission, strict writes, hard delete + audit.
**Depends on:** Phase 00 (done). Safe now.

> Built as the **right pane** of the Jobs split view; left list pane is Step B-list.

- [x] `app/jobs/page.tsx` — split view shell; right pane reads `?id=` or selection state; placeholder when none.
- [x] Detail data: `resolveContext({ surfaceId: "job_detail", entityId })` → `dal.jobs.get`.
- [x] `CapabilitiesProvider` wraps detail; one `Card` per Field group (`summary`, `scope`, `financial_terms`, `assignments`).
- [x] Read-only render via AntD `Descriptions`; editable via RHF `Form` only when `write`.
- [x] Save: Server Action → `dal.jobs.patch` with manifest-narrowed Zod parse.
- [x] Delete: `Modal.confirm` → Server Action → `dal.jobs.delete` (hard delete); clear selection on success.
- [x] Forbidden Fields absent from DOM (not hidden) — verify in markup.

**Verify (stop gate):**
- [ ] As tech: `financial_terms` section not rendered at all.
- [ ] As admin: financials visible; editable per manifest.
- [ ] Save persists; reload shows new value.
- [ ] Delete removes row; detail pane resets; (Postgres wired) `latch_audit` row exists with `action = delete` — see audit note below.

**Audit check (optional):** Job rows live in memory; `DATABASE_URL` only wires the **audit log** to Neon. Set the same Neon direct URL in `apps/crm/.env.local` as `apps/web`, run `npm run db:migrate` once, then after delete:

```bash
psql "$DATABASE_URL" -c "SELECT occurred_at, actor_id, action, entity_id FROM latch_audit WHERE action = 'delete' ORDER BY occurred_at DESC LIMIT 5;"
```

Or use the Neon SQL Editor in the dashboard. See [`../../../docs/foundations/development.md`](../../../docs/foundations/development.md).

---

## Step B-list — Jobs list pane

**Proves:** Phase 01 `list`, projection, row scope.
**Depends on:** Phase 01 `dal.jobs.list` **merged to `main`** — do not start before then (timing rule).

- [x] Left pane `Table` from list DTO; `rowKey="id"`; `onRow` click sets selected id → detail pane.
- [x] Columns derived from list DTO keys ∩ manifest (no forbidden columns).
- [x] Loading (`Table loading`) + empty (`Empty`) states.
- [ ] (Optional) bulk select + one toolbar action — **skipped**; `tests/job-list.e2e.test.ts` covers bulk.

**Verify (stop gate):**
- [x] Tech row count ≤ admin row count (row scope visible live).
- [x] No financial column for tech.

---

## Later (gated by their phases — do not build ahead)

- [ ] **Customers split view** — when `customer_detail` (Phase 02) merged.
- [ ] **Real auth** — when Phase 03 lands; remove stub login + dev role env.
- [ ] **Restore-from-audit admin view** — only if Phase 04 tool exists.
- [ ] **Pending banner / accept-reject** — only if Phase 05 scheduled for the demo.

## Done = CRM proof harness

Mirror the checklist in [`PLAN.md`](./PLAN.md) "Definition of done". When Steps A + B-detail + B-list pass, the harness proves Phases 00–01 end-to-end through a second consumer.
