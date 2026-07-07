// DO NOT EDIT — generated from complexity_factor_table.surface.yaml

import type { Manifest } from "@latch/contracts";
import type { SurfaceDescriptor } from "@latch/dal";
import { z } from "zod";

import {
  ComplexityFactorTablePatchSchema,
} from "./complexity_factor_table.schema.generated";

export type ComplexityFactorTableRow = {
  factor_percent: number;
  id: string;
  name: string;
  sort_order: number;
};

const formatComplexityFactorTableRow = (row: ComplexityFactorTableRow): Record<string, unknown> => ({
  factor_percent: row.factor_percent,
  id: row.id,
  name: row.name,
  sort_order: row.sort_order,
});

export const projectComplexityFactorTableRow = (
  row: ComplexityFactorTableRow,
  manifest: Manifest,
  _related: unknown,
  _listJoins?: Record<string, unknown>,
): Record<string, unknown> => {
  const dto: Record<string, unknown> = { id: row.id };

  if (manifest.fields.name?.includes("read")) {
    dto.name = { id: row.id, name: row.name };
  }
  if (manifest.fields.factor_percent?.includes("read")) {
    dto.factor_percent = { factor_percent: row.factor_percent };
  }
  if (manifest.fields.sort_order?.includes("read")) {
    dto.sort_order = { sort_order: row.sort_order };
  }
  return dto;
};

export const applyComplexityFactorTablePatch = (
  row: ComplexityFactorTableRow,
  patch: Record<string, unknown>,
): ComplexityFactorTableRow => {
  const next = { ...row };
  const typed = patch as z.infer<typeof ComplexityFactorTablePatchSchema>;

  if (typed.name?.id !== undefined) {
    next.id = typed.name.id;
  }
  if (typed.name?.name !== undefined) {
    next.name = typed.name.name;
  }
  if (typed.factor_percent?.factor_percent !== undefined) {
    next.factor_percent = typed.factor_percent.factor_percent;
  }
  if (typed.sort_order?.sort_order !== undefined) {
    next.sort_order = typed.sort_order.sort_order;
  }
  return next;
};

export const complexityFactorTableDescriptor: SurfaceDescriptor<ComplexityFactorTableRow> = {
  surfaceId: "complexity_factor_table",
  anchorTable: "complexity_factor",
  capabilities: ["detail"],
  patchSchema: ComplexityFactorTablePatchSchema,
  deleteAuditFieldId: "name",
  projectRow: projectComplexityFactorTableRow,
  applyPatch: applyComplexityFactorTablePatch,
  auditSnapshot: formatComplexityFactorTableRow,
  canDelete: (ctx) => ctx.manifest.actions.includes("delete"),
};
