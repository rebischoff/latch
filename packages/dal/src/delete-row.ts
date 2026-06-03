import { writeAudit } from "@latch/audit";
import { surfaceAllows, type PermissionContext } from "@latch/contracts";

import type { StoreAdapter } from "./store-adapter.js";
import type { SurfaceDescriptor } from "./surface-descriptor.js";

export const canDeleteRow = <TRow, TRelated>(
  descriptor: SurfaceDescriptor<TRow, TRelated>,
  ctx: PermissionContext,
): boolean => descriptor.canDelete?.(ctx) ?? false;

export const deleteRowWithAudit = async <TRow, TRelated>(
  descriptor: SurfaceDescriptor<TRow, TRelated>,
  store: StoreAdapter<TRow, TRelated>,
  ctx: PermissionContext,
  row: TRow & { id: string },
  opts?: { requestId?: string },
): Promise<void> => {
  const id = row.id;
  const related = store.getRelated(id);
  const beforeSnapshot =
    surfaceAllows(ctx.manifest, "restore") && descriptor.deleteAuditSnapshot
      ? descriptor.deleteAuditSnapshot(row, related)
      : descriptor.auditSnapshot(row);
  store.delete(id);

  await writeAudit({
    actorId: ctx.principal.id,
    action: "delete",
    tableName: descriptor.anchorTable,
    recordId: id,
    moduleId: ctx.surface,
    fieldIds: [descriptor.deleteAuditFieldId ?? "summary"],
    before: beforeSnapshot,
    after: null,
    requestId: opts?.requestId,
  });
};
