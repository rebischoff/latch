// DO NOT EDIT — generated from labor_phase_table.surface.yaml

import type { Manifest } from "@latch/contracts";
import type { SurfaceDescriptor } from "@latch/dal";
import { z } from "zod";

import {
  LaborPhaseTablePatchSchema,
} from "./labor_phase_table.schema.generated";

export type LaborPhaseTableRow = {
  id: string;
  name: string;
  sort_order: number;
};

const formatLaborPhaseTableRow = (row: LaborPhaseTableRow): Record<string, unknown> => ({
  id: row.id,
  name: row.name,
  sort_order: row.sort_order,
});

export const projectLaborPhaseTableRow = (
  row: LaborPhaseTableRow,
  manifest: Manifest,
  _related: unknown,
  _listJoins?: Record<string, unknown>,
): Record<string, unknown> => {
  const dto: Record<string, unknown> = { id: row.id };

  if (manifest.fields.name?.includes("read")) {
    dto.name = { id: row.id, name: row.name };
  }
  if (manifest.fields.sort_order?.includes("read")) {
    dto.sort_order = { sort_order: row.sort_order };
  }
  return dto;
};

export const applyLaborPhaseTablePatch = (
  row: LaborPhaseTableRow,
  patch: Record<string, unknown>,
): LaborPhaseTableRow => {
  const next = { ...row };
  const typed = patch as z.infer<typeof LaborPhaseTablePatchSchema>;

  if (typed.name?.id !== undefined) {
    next.id = typed.name.id;
  }
  if (typed.name?.name !== undefined) {
    next.name = typed.name.name;
  }
  if (typed.sort_order?.sort_order !== undefined) {
    next.sort_order = typed.sort_order.sort_order;
  }
  return next;
};

export const laborPhaseTableDescriptor: SurfaceDescriptor<LaborPhaseTableRow> = {
  surfaceId: "labor_phase_table",
  anchorTable: "labor_phase",
  capabilities: ["detail"],
  patchSchema: LaborPhaseTablePatchSchema,
  deleteAuditFieldId: "name",
  projectRow: projectLaborPhaseTableRow,
  applyPatch: applyLaborPhaseTablePatch,
  auditSnapshot: formatLaborPhaseTableRow,
  canDelete: (ctx) => ctx.manifest.actions.includes("delete"),
};
