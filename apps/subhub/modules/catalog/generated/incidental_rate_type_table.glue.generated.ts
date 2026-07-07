// DO NOT EDIT — generated from incidental_rate_type_table.surface.yaml

import type { Manifest } from "@latch/contracts";
import type { SurfaceDescriptor } from "@latch/dal";
import { z } from "zod";

import {
  IncidentalRateTypeTablePatchSchema,
} from "./incidental_rate_type_table.schema.generated";

export type IncidentalRateTypeTableRow = {
  amount_cents: number;
  id: string;
  name: string;
  percent: number;
  sort_order: number;
};

const formatIncidentalRateTypeTableRow = (row: IncidentalRateTypeTableRow): Record<string, unknown> => ({
  amount_cents: row.amount_cents,
  id: row.id,
  name: row.name,
  percent: row.percent,
  sort_order: row.sort_order,
});

export const projectIncidentalRateTypeTableRow = (
  row: IncidentalRateTypeTableRow,
  manifest: Manifest,
  _related: unknown,
  _listJoins?: Record<string, unknown>,
): Record<string, unknown> => {
  const dto: Record<string, unknown> = { id: row.id };

  if (manifest.fields.name?.includes("read")) {
    dto.name = { id: row.id, name: row.name };
  }
  if (manifest.fields.percent?.includes("read")) {
    dto.percent = { percent: row.percent };
  }
  if (manifest.fields.amount_cents?.includes("read")) {
    dto.amount_cents = { amount_cents: row.amount_cents };
  }
  if (manifest.fields.sort_order?.includes("read")) {
    dto.sort_order = { sort_order: row.sort_order };
  }
  return dto;
};

export const applyIncidentalRateTypeTablePatch = (
  row: IncidentalRateTypeTableRow,
  patch: Record<string, unknown>,
): IncidentalRateTypeTableRow => {
  const next = { ...row };
  const typed = patch as z.infer<typeof IncidentalRateTypeTablePatchSchema>;

  if (typed.name?.id !== undefined) {
    next.id = typed.name.id;
  }
  if (typed.name?.name !== undefined) {
    next.name = typed.name.name;
  }
  if (typed.percent?.percent !== undefined) {
    next.percent = typed.percent.percent;
  }
  if (typed.amount_cents?.amount_cents !== undefined) {
    next.amount_cents = typed.amount_cents.amount_cents;
  }
  if (typed.sort_order?.sort_order !== undefined) {
    next.sort_order = typed.sort_order.sort_order;
  }
  return next;
};

export const incidentalRateTypeTableDescriptor: SurfaceDescriptor<IncidentalRateTypeTableRow> = {
  surfaceId: "incidental_rate_type_table",
  anchorTable: "cost_add_on_type",
  capabilities: ["detail"],
  patchSchema: IncidentalRateTypeTablePatchSchema,
  deleteAuditFieldId: "name",
  projectRow: projectIncidentalRateTypeTableRow,
  applyPatch: applyIncidentalRateTypeTablePatch,
  auditSnapshot: formatIncidentalRateTypeTableRow,
  canDelete: (ctx) => ctx.manifest.actions.includes("delete"),
};
