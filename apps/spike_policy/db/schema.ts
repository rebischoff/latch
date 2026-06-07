/**
 * Proposed runtime-roles tables for the policy spike (drives task 01 DDL).
 *
 * Encodes the *proposals* in `packages/policy/docs/tasks/00-decisions-needed.md`:
 *  - P1: `row_scope` per grant row (nullable); provider takes the max per role×surface.
 *  - P2: `latch_role_grants.role_id` FK → `latch_roles.id`.
 *  - P3: pilot roles seeded as deletable `kind: 'app'` rows (see migrations/001).
 *  - P4: `data_master` / `iam_master` grants are NOT rows — synthesized in PolicyService.
 *  - P6: `mode` nullable and OUT of the PK (overlays deferred).
 *
 * Disposable: this is a fixture, not the template DDL. Assertions live in
 * `packages/policy/src/*.test.ts` (vitest only scans `packages/**`).
 */
import {
  boolean,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/** Role catalog. Built-ins seeded `is_builtin = true` and not app-deletable. */
export const latchRoles = pgTable("latch_roles", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull(),
  /** `app` | `builtin`. */
  kind: text("kind").notNull().default("app"),
  isBuiltin: boolean("is_builtin").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** One grant per role × surface × field × action (P1: row_scope per row). */
export const latchRoleGrants = pgTable(
  "latch_role_grants",
  {
    roleId: text("role_id")
      .notNull()
      .references(() => latchRoles.id, { onDelete: "cascade" }),
    surfaceId: text("surface_id").notNull(),
    fieldId: text("field_id").notNull(),
    /** `read` | `write` | `delete` | … (validated against codegen vocabulary). */
    action: text("action").notNull(),
    /** `own` | `all`; nullable (resolver defaults / merges to most-permissive). */
    rowScope: text("row_scope"),
    /** `allow` | `deny` (denyWins handled in PolicyService merge). */
    effect: text("effect").notNull().default("allow"),
    /** P6 deferred: NULL = applies to all modes. */
    mode: text("mode"),
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.roleId, table.surfaceId, table.fieldId, table.action],
    }),
  }),
);
