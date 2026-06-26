import type { Manifest } from "@latch/contracts";
import type { SurfaceDescriptor } from "@latch/dal";
import { z } from "zod";

import { EmployeeListPatchSchema } from "../../../modules/employee/generated/employee_list.schema.generated";

export type EmployeeListRow = {
  display_name: string;
  id: string;
  latch_user_id: string | null;
};

export const EmployeeListListQuerySchema = z.object({
  q: z.string().optional(),
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().nonnegative().optional(),
});

const formatEmployeeListRow = (row: EmployeeListRow): Record<string, unknown> => ({
  display_name: row.display_name,
  id: row.id,
  latch_user_id: row.latch_user_id,
});

export const projectEmployeeListRow = (
  row: EmployeeListRow,
  manifest: Manifest,
): Record<string, unknown> => {
  const dto: Record<string, unknown> = { id: row.id };

  if (manifest.fields.summary?.includes("read")) {
    dto.summary = {
      id: row.id,
      display_name: row.display_name,
      latch_user_id: row.latch_user_id,
      has_login: row.latch_user_id !== null,
    };
  }

  return dto;
};

export const applyEmployeeListPatch = (
  row: EmployeeListRow,
  patch: Record<string, unknown>,
): EmployeeListRow => {
  const next = { ...row };
  const typed = patch as z.infer<typeof EmployeeListPatchSchema>;

  if (typed.summary?.id !== undefined) {
    next.id = typed.summary.id;
  }
  if (typed.summary?.display_name !== undefined) {
    next.display_name = typed.summary.display_name;
  }
  if (typed.summary?.latch_user_id !== undefined) {
    next.latch_user_id = typed.summary.latch_user_id;
  }

  return next;
};

export const employeeListDescriptor: SurfaceDescriptor<EmployeeListRow> = {
  surfaceId: "employee_list",
  anchorTable: "party",
  capabilities: ["list"],
  patchSchema: EmployeeListPatchSchema,
  listQuerySchema: EmployeeListListQuerySchema,
  listDefaultPageSize: 50,
  deleteAuditFieldId: "summary",
  projectRow: (row, manifest) => projectEmployeeListRow(row, manifest),
  applyPatch: applyEmployeeListPatch,
  auditSnapshot: formatEmployeeListRow,
  canDelete: (ctx) => ctx.manifest.actions.includes("delete"),
};
