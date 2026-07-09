// DO NOT EDIT — generated from spec_unit_table.surface.yaml

import type { Manifest } from "@latch/contracts";
import type { SurfaceDescriptor } from "@latch/dal";
import { z } from "zod";

import {
  SpecUnitTablePatchSchema,
} from "./spec_unit_table.schema.generated";

export type SpecUnitTableRow = {
  canonical_unit_id: string;
  dimension: string;
  id: string;
  name: string;
  sort_order: number;
  symbol: string;
  to_canonical_factor: number;
};

const formatSpecUnitTableRow = (row: SpecUnitTableRow): Record<string, unknown> => ({
  canonical_unit_id: row.canonical_unit_id,
  dimension: row.dimension,
  id: row.id,
  name: row.name,
  sort_order: row.sort_order,
  symbol: row.symbol,
  to_canonical_factor: row.to_canonical_factor,
});

export const projectSpecUnitTableRow = (
  row: SpecUnitTableRow,
  manifest: Manifest,
  _related: unknown,
  _listJoins?: Record<string, unknown>,
): Record<string, unknown> => {
  const dto: Record<string, unknown> = { id: row.id };

  if (manifest.fields.symbol?.includes("read")) {
    dto.symbol = { symbol: row.symbol };
  }
  if (manifest.fields.name?.includes("read")) {
    dto.name = { id: row.id, name: row.name };
  }
  if (manifest.fields.dimension?.includes("read")) {
    dto.dimension = { dimension: row.dimension };
  }
  if (manifest.fields.canonical_unit_id?.includes("read")) {
    dto.canonical_unit_id = { canonical_unit_id: row.canonical_unit_id };
  }
  if (manifest.fields.to_canonical_factor?.includes("read")) {
    dto.to_canonical_factor = { to_canonical_factor: row.to_canonical_factor };
  }
  if (manifest.fields.sort_order?.includes("read")) {
    dto.sort_order = { sort_order: row.sort_order };
  }
  return dto;
};

export const applySpecUnitTablePatch = (
  row: SpecUnitTableRow,
  patch: Record<string, unknown>,
): SpecUnitTableRow => {
  const next = { ...row };
  const typed = patch as z.infer<typeof SpecUnitTablePatchSchema>;

  if (typed.symbol?.symbol !== undefined) {
    next.symbol = typed.symbol.symbol;
  }
  if (typed.name?.id !== undefined) {
    next.id = typed.name.id;
  }
  if (typed.name?.name !== undefined) {
    next.name = typed.name.name;
  }
  if (typed.dimension?.dimension !== undefined) {
    next.dimension = typed.dimension.dimension;
  }
  if (typed.canonical_unit_id?.canonical_unit_id !== undefined) {
    next.canonical_unit_id = typed.canonical_unit_id.canonical_unit_id;
  }
  if (typed.to_canonical_factor?.to_canonical_factor !== undefined) {
    next.to_canonical_factor = typed.to_canonical_factor.to_canonical_factor;
  }
  if (typed.sort_order?.sort_order !== undefined) {
    next.sort_order = typed.sort_order.sort_order;
  }
  return next;
};

export const specUnitTableDescriptor: SurfaceDescriptor<SpecUnitTableRow> = {
  surfaceId: "spec_unit_table",
  anchorTable: "spec_unit",
  capabilities: ["detail"],
  patchSchema: SpecUnitTablePatchSchema,
  deleteAuditFieldId: "symbol",
  projectRow: projectSpecUnitTableRow,
  applyPatch: applySpecUnitTablePatch,
  auditSnapshot: formatSpecUnitTableRow,
  canDelete: (ctx) => ctx.manifest.actions.includes("delete"),
};
