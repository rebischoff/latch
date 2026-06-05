/**
 * Drizzle schema for Latch platform tables (task 05).
 * Queries should move here from raw SQL in `load-roles.ts` / `resolve-latch-user.ts` (task 10+).
 */
import {
  bigint,
  bigserial,
  jsonb,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/** Latch identity rows — `Principal.id` matches `id`; Better Auth aligns via `login_email`. */
export const latchUsers = pgTable("latch_users", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull(),
  loginEmail: text("login_email").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** User ↔ role assignments; `role_id` matches policy catalog keys. */
export const latchUserRoles = pgTable(
  "latch_user_roles",
  {
    userId: text("user_id")
      .notNull()
      .references(() => latchUsers.id, { onDelete: "cascade" }),
    roleId: text("role_id").notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.roleId] })],
);

/** Append-only audit log (`latch_*` prefix per naming.md). */
export const latchAudit = pgTable("latch_audit", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  occurredAt: timestamp("occurred_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  actorId: text("actor_id").notNull(),
  action: text("action").notNull(),
  moduleId: text("module_id"),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  fieldIds: text("field_ids").array(),
  before: jsonb("before"),
  after: jsonb("after"),
  patch: jsonb("patch"),
  requestId: text("request_id"),
  approvalId: text("approval_id"),
});

/** Single-row manifest cache invalidation counter (Phase 06). */
export const latchPolicyVersion = pgTable("latch_policy_version", {
  id: smallint("id").primaryKey().default(1),
  version: bigint("version", { mode: "number" }).notNull().default(1),
});

export type LatchUserRow = typeof latchUsers.$inferSelect;
export type LatchUserInsert = typeof latchUsers.$inferInsert;
export type LatchUserRoleRow = typeof latchUserRoles.$inferSelect;
export type LatchAuditRow = typeof latchAudit.$inferSelect;
export type LatchPolicyVersionRow = typeof latchPolicyVersion.$inferSelect;
