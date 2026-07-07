// DO NOT EDIT — generated from labor_rate_type_table.surface.yaml

import type { Manifest } from "@latch/contracts";
import type { SurfaceDescriptor } from "@latch/dal";
import { z } from "zod";

import {
  LaborRateTypeTablePatchSchema,
} from "./labor_rate_type_table.schema.generated";

export type LaborRateTypeTableRow = {
  id: string;
  name: string;
  rate_cents: number;
  sort_order: number;
};

const formatLaborRateTypeTableRow = (row: LaborRateTypeTableRow): Record<string, unknown> => ({
  id: row.id,
  name: row.name,
  rate_cents: row.rate_cents,
  sort_order: row.sort_order,
});

export const projectLaborRateTypeTableRow = (
  row: LaborRateTypeTableRow,
  manifest: Manifest,
  _related: unknown,
  _listJoins?: Record<string, unknown>,
): Record<string, unknown> => {
  const dto: Record<string, unknown> = { id: row.id };

  if (manifest.fields.name?.includes("read")) {
    dto.name = { id: row.id, name: row.name };
  }
  if (manifest.fields.rate_cents?.includes("read")) {
    dto.rate_cents = { rate_cents: row.rate_cents };
  }
  if (manifest.fields.sort_order?.includes("read")) {
    dto.sort_order = { sort_order: row.sort_order };
  }
  return dto;
};

export const applyLaborRateTypeTablePatch = (
  row: LaborRateTypeTableRow,
  patch: Record<string, unknown>,
): LaborRateTypeTableRow => {
  const next = { ...row };
  const typed = patch as z.infer<typeof LaborRateTypeTablePatchSchema>;

  if (typed.name?.id !== undefined) {
    next.id = typed.name.id;
  }
  if (typed.name?.name !== undefined) {
    next.name = typed.name.name;
  }
  if (typed.rate_cents?.rate_cents !== undefined) {
    next.rate_cents = typed.rate_cents.rate_cents;
  }
  if (typed.sort_order?.sort_order !== undefined) {
    next.sort_order = typed.sort_order.sort_order;
  }
  return next;
};

export const laborRateTypeTableDescriptor: SurfaceDescriptor<LaborRateTypeTableRow> = {
  surfaceId: "labor_rate_type_table",
  anchorTable: "labor_rate_type",
  capabilities: ["detail"],
  patchSchema: LaborRateTypeTablePatchSchema,
  deleteAuditFieldId: "name",
  projectRow: projectLaborRateTypeTableRow,
  applyPatch: applyLaborRateTypeTablePatch,
  auditSnapshot: formatLaborRateTypeTableRow,
  canDelete: (ctx) => ctx.manifest.actions.includes("delete"),
};
