// DO NOT EDIT — generated from customer_list.surface.yaml

import type { Manifest } from "@latch/contracts";
import type { SurfaceDescriptor } from "@latch/dal";
import { z } from "zod";

import {
  CustomerListPatchSchema,
} from "./customer_list.schema.generated.js";


export const CustomerListListQuerySchema = z.object({
  status: z.string().optional(),
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().nonnegative().optional(),
});
export type CustomerListRow = {
  display_name: string;
  id: string;
  kind: string;
};

const formatCustomerListRow = (row: CustomerListRow): Record<string, unknown> => ({
  display_name: row.display_name,
  id: row.id,
  kind: row.kind,
});

export const projectCustomerListRow = (
  row: CustomerListRow,
  manifest: Manifest,
  _related: unknown,
  _listJoins?: Record<string, unknown>,
): Record<string, unknown> => {
  const dto: Record<string, unknown> = { id: row.id };

  if (manifest.fields.summary?.includes("read")) {
    dto.summary = { id: row.id, display_name: row.display_name, kind: row.kind };
  }
  return dto;
};

export const applyCustomerListPatch = (
  row: CustomerListRow,
  patch: Record<string, unknown>,
): CustomerListRow => {
  const next = { ...row };
  const typed = patch as z.infer<typeof CustomerListPatchSchema>;

  if (typed.summary?.id !== undefined) {
    next.id = typed.summary.id;
  }
  if (typed.summary?.display_name !== undefined) {
    next.display_name = typed.summary.display_name;
  }
  if (typed.summary?.kind !== undefined) {
    next.kind = typed.summary.kind;
  }
  return next;
};

export const customerListDescriptor: SurfaceDescriptor<CustomerListRow> = {
  surfaceId: "customer_list",
  anchorTable: "party",
  capabilities: ["list"],
  patchSchema: CustomerListPatchSchema,
  listQuerySchema: CustomerListListQuerySchema,
  listDefaultPageSize: 50,
  deleteAuditFieldId: "summary",
  projectRow: projectCustomerListRow,
  applyPatch: applyCustomerListPatch,
  auditSnapshot: formatCustomerListRow,
  canDelete: (ctx) => ctx.manifest.actions.includes("delete"),
};
