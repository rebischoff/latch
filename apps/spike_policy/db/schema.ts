/**
 * Platform + runtime-roles tables for the policy spike (P11 catalog shape).
 *
 * Locked shape (packages/policy/docs/tasks/00-decisions-needed.md):
 *  - P1: `row_scope` on `latch_role_surfaces` per (role, surface); not on grant rows.
 *  - P2: `latch_user_roles.role_id` → `latch_roles.id` RESTRICT; grants/bindings CASCADE.
 *  - P3: template seeds system catalog rows only; pilot roles in 900_fixture_pilot_roles.sql.
 *  - P4: system grants synthesized in PolicyService, not stored as rows.
 *  - P6: `mode` nullable on grants (overlays deferred).
 *  - P11: UUID PK + `role_class`; no slug, no row `created_at` on catalog.
 *
 * Disposable fixture — graduates to business-app template migrations.
 */
import {
  bigint,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const latchUsers = pgTable("latch_users", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Role catalog — UUID PK + `role_class` (P11). Ids are DB-generated; system rows
 * are identified by `role_class` (partial unique singleton index in migration 003).
 */
export const latchRoles = pgTable("latch_roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** `system_data` | `system_iam` | `app`. */
  roleClass: text("role_class").notNull(),
  displayName: text("display_name").notNull(),
});

export const latchUserRoles = pgTable(
  "latch_user_roles",
  {
    userId: text("user_id")
      .notNull()
      .references(() => latchUsers.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => latchRoles.id, { onDelete: "restrict" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.roleId] }),
  }),
);

/** One binding per role × surface; authoritative `row_scope` (P1). */
export const latchRoleSurfaces = pgTable(
  "latch_role_surfaces",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => latchRoles.id, { onDelete: "cascade" }),
    surfaceId: text("surface_id").notNull(),
    /** `own` | `all`; nullable until configured. */
    rowScope: text("row_scope"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.roleId, table.surfaceId] }),
  }),
);

/** Sparse allow-rows per role × surface × field × action (P2a default deny). */
export const latchRoleGrants = pgTable(
  "latch_role_grants",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => latchRoles.id, { onDelete: "cascade" }),
    surfaceId: text("surface_id").notNull(),
    /** Nullable for surface-level actions. */
    fieldId: text("field_id"),
    action: text("action").notNull(),
    /** P6 deferred: NULL = applies to all modes. */
    mode: text("mode"),
  },
  (table) => ({
    tupleUnique: unique("latch_role_grants_tuple_unique").on(
      table.roleId,
      table.surfaceId,
      table.fieldId,
      table.action,
    ),
  }),
);

export const latchPolicyVersion = pgTable("latch_policy_version", {
  id: smallint("id").primaryKey().default(1),
  version: bigint("version", { mode: "number" }).notNull().default(1),
});
