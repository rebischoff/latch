// DO NOT EDIT — generated from markup_type_table.surface.yaml

import type { Manifest } from "@latch/contracts";
import type { SurfaceDescriptor } from "@latch/dal";
import { z } from "zod";

import {
  MarkupTypeTablePatchSchema,
} from "./markup_type_table.schema.generated";

export type MarkupTypeTableRow = {
  id: string;
  labor_markup_percent: number;
  material_markup_percent: number;
  name: string;
  sort_order: number;
};

const formatMarkupTypeTableRow = (row: MarkupTypeTableRow): Record<string, unknown> => ({
  id: row.id,
  labor_markup_percent: row.labor_markup_percent,
  material_markup_percent: row.material_markup_percent,
  name: row.name,
  sort_order: row.sort_order,
});

export const projectMarkupTypeTableRow = (
  row: MarkupTypeTableRow,
  manifest: Manifest,
  _related: unknown,
  _listJoins?: Record<string, unknown>,
): Record<string, unknown> => {
  const dto: Record<string, unknown> = { id: row.id };

  if (manifest.fields.name?.includes("read")) {
    dto.name = { id: row.id, name: row.name };
  }
  if (manifest.fields.material_markup_percent?.includes("read")) {
    dto.material_markup_percent = { material_markup_percent: row.material_markup_percent };
  }
  if (manifest.fields.labor_markup_percent?.includes("read")) {
    dto.labor_markup_percent = { labor_markup_percent: row.labor_markup_percent };
  }
  if (manifest.fields.sort_order?.includes("read")) {
    dto.sort_order = { sort_order: row.sort_order };
  }
  return dto;
};

export const applyMarkupTypeTablePatch = (
  row: MarkupTypeTableRow,
  patch: Record<string, unknown>,
): MarkupTypeTableRow => {
  const next = { ...row };
  const typed = patch as z.infer<typeof MarkupTypeTablePatchSchema>;

  if (typed.name?.id !== undefined) {
    next.id = typed.name.id;
  }
  if (typed.name?.name !== undefined) {
    next.name = typed.name.name;
  }
  if (typed.material_markup_percent?.material_markup_percent !== undefined) {
    next.material_markup_percent = typed.material_markup_percent.material_markup_percent;
  }
  if (typed.labor_markup_percent?.labor_markup_percent !== undefined) {
    next.labor_markup_percent = typed.labor_markup_percent.labor_markup_percent;
  }
  if (typed.sort_order?.sort_order !== undefined) {
    next.sort_order = typed.sort_order.sort_order;
  }
  return next;
};

export const markupTypeTableDescriptor: SurfaceDescriptor<MarkupTypeTableRow> = {
  surfaceId: "markup_type_table",
  anchorTable: "markup_type",
  capabilities: ["detail"],
  patchSchema: MarkupTypeTablePatchSchema,
  deleteAuditFieldId: "name",
  projectRow: projectMarkupTypeTableRow,
  applyPatch: applyMarkupTypeTablePatch,
  auditSnapshot: formatMarkupTypeTableRow,
  canDelete: (ctx) => ctx.manifest.actions.includes("delete"),
};
