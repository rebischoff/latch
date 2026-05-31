import {
  bigserial,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/** Pilot users — stub auth maps `Principal.id` to these rows (task 15). */
export const latchUsers = pgTable("latch_users", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Anchor table for `job_detail` Surface. */
export const jobs = pgTable("jobs", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  status: text("status").notNull(),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  description: text("description"),
  contractAmount: numeric("contract_amount", { precision: 12, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Row-scope `own` — field tech sees jobs where `user_id` matches principal. */
export const assignments = pgTable(
  "assignments",
  {
    jobId: text("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => latchUsers.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.jobId, table.userId] })],
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

export type LatchUserRow = typeof latchUsers.$inferSelect;
export type LatchUserInsert = typeof latchUsers.$inferInsert;
export type JobRow = typeof jobs.$inferSelect;
export type JobInsert = typeof jobs.$inferInsert;
export type AssignmentRow = typeof assignments.$inferSelect;
export type AssignmentInsert = typeof assignments.$inferInsert;
export type LatchAuditRow = typeof latchAudit.$inferSelect;
export type LatchAuditInsert = typeof latchAudit.$inferInsert;
