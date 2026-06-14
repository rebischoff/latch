// DO NOT EDIT — generated from vendor_list.surface.yaml

import type { Manifest } from "@latch/contracts";
import type { SurfaceDescriptor } from "@latch/dal";
import { z } from "zod";

import {
  VendorListPatchSchema,
} from "./vendor_list.schema.generated.js";


export const VendorListListQuerySchema = z.object({
  status: z.string().optional(),
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().nonnegative().optional(),
});
export type VendorListRow = {
  display_name: string;
  id: string;
  kind: string;
};

const formatVendorListRow = (row: VendorListRow): Record<string, unknown> => ({
  display_name: row.display_name,
  id: row.id,
  kind: row.kind,
});

export const projectVendorListRow = (
  row: VendorListRow,
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

export const applyVendorListPatch = (
  row: VendorListRow,
  patch: Record<string, unknown>,
): VendorListRow => {
  const next = { ...row };
  const typed = patch as z.infer<typeof VendorListPatchSchema>;

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

export const vendorListDescriptor: SurfaceDescriptor<VendorListRow> = {
  surfaceId: "vendor_list",
  anchorTable: "party",
  capabilities: ["list"],
  patchSchema: VendorListPatchSchema,
  listQuerySchema: VendorListListQuerySchema,
  listDefaultPageSize: 50,
  deleteAuditFieldId: "summary",
  projectRow: projectVendorListRow,
  applyPatch: applyVendorListPatch,
  auditSnapshot: formatVendorListRow,
  canDelete: (ctx) => ctx.manifest.actions.includes("delete"),
};
