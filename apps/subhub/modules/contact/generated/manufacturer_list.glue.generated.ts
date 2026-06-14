// DO NOT EDIT — generated from manufacturer_list.surface.yaml

import type { Manifest } from "@latch/contracts";
import type { SurfaceDescriptor } from "@latch/dal";
import { z } from "zod";

import {
  ManufacturerListPatchSchema,
} from "./manufacturer_list.schema.generated.js";


export const ManufacturerListListQuerySchema = z.object({
  status: z.string().optional(),
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().nonnegative().optional(),
});
export type ManufacturerListRow = {
  display_name: string;
  id: string;
  kind: string;
};

const formatManufacturerListRow = (row: ManufacturerListRow): Record<string, unknown> => ({
  display_name: row.display_name,
  id: row.id,
  kind: row.kind,
});

export const projectManufacturerListRow = (
  row: ManufacturerListRow,
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

export const applyManufacturerListPatch = (
  row: ManufacturerListRow,
  patch: Record<string, unknown>,
): ManufacturerListRow => {
  const next = { ...row };
  const typed = patch as z.infer<typeof ManufacturerListPatchSchema>;

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

export const manufacturerListDescriptor: SurfaceDescriptor<ManufacturerListRow> = {
  surfaceId: "manufacturer_list",
  anchorTable: "party",
  capabilities: ["list"],
  patchSchema: ManufacturerListPatchSchema,
  listQuerySchema: ManufacturerListListQuerySchema,
  listDefaultPageSize: 50,
  deleteAuditFieldId: "summary",
  projectRow: projectManufacturerListRow,
  applyPatch: applyManufacturerListPatch,
  auditSnapshot: formatManufacturerListRow,
  canDelete: (ctx) => ctx.manifest.actions.includes("delete"),
};
