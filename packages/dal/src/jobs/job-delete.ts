import { writeAudit } from "@latch/audit";
import {
  fieldAllows,
  surfaceAllows,
  type PermissionContext,
} from "@latch/contracts";

import { jobRowAuditSnapshot } from "./apply-patch.js";
import type { MemoryJobRecord, MemoryJobStore } from "./memory-store.js";

export const canDeleteJob = (ctx: PermissionContext): boolean =>
  surfaceAllows(ctx.manifest, "delete") ||
  fieldAllows(ctx.manifest, "summary", "delete");

export const deleteJobWithAudit = async (
  store: MemoryJobStore,
  ctx: PermissionContext,
  row: MemoryJobRecord,
  opts?: { requestId?: string },
): Promise<void> => {
  const id = row.id;
  const beforeSnapshot = jobRowAuditSnapshot(row);
  store.deleteJob(id);

  await writeAudit({
    actorId: ctx.principal.id,
    action: "delete",
    tableName: "jobs",
    recordId: id,
    moduleId: ctx.surface,
    fieldIds: ["summary"],
    before: beforeSnapshot,
    after: null,
    requestId: opts?.requestId,
  });
};
