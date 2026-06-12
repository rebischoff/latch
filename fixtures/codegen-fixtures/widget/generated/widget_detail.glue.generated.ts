// DO NOT EDIT — generated from widget_detail.surface.yaml

import type { Manifest } from "@latch/contracts";
import type { SurfaceDescriptor } from "@latch/dal";
import { z } from "zod";

import {
  WidgetDetailPatchSchema,
} from "./widget_detail.schema.generated.js";

export type WidgetDetailRow = {
  label: string;
  scope_id: string;
  status: string;
};

const formatWidgetDetailRow = (row: WidgetDetailRow): Record<string, unknown> => ({
  label: row.label,
  scope_id: row.scope_id,
  status: row.status,
});

export const projectWidgetDetailRow = (
  row: WidgetDetailRow,
  manifest: Manifest,
  _related: unknown,
  _listJoins?: Record<string, unknown>,
): Record<string, unknown> => {
  const dto: Record<string, unknown> = { id: row.id };

  if (manifest.fields.label?.includes("read")) {
    dto.label = { label: row.label };
  }
  if (manifest.fields.status?.includes("read")) {
    dto.status = { status: row.status };
  }
  if (manifest.fields.branch_scope?.includes("read")) {
    dto.branch_scope = { scope_id: row.scope_id };
  }
  return dto;
};

export const applyWidgetDetailPatch = (
  row: WidgetDetailRow,
  patch: Record<string, unknown>,
): WidgetDetailRow => {
  const next = { ...row };
  const typed = patch as z.infer<typeof WidgetDetailPatchSchema>;

  if (typed.label?.label !== undefined) {
    next.label = typed.label.label;
  }
  if (typed.status?.status !== undefined) {
    next.status = typed.status.status;
  }
  if (typed.branch_scope?.scope_id !== undefined) {
    next.scope_id = typed.branch_scope.scope_id;
  }
  return next;
};

export const widgetDetailDescriptor: SurfaceDescriptor<WidgetDetailRow> = {
  surfaceId: "widget_detail",
  anchorTable: "widgets",
  capabilities: ["detail"],
  patchSchema: WidgetDetailPatchSchema,
  deleteAuditFieldId: "label",
  projectRow: projectWidgetDetailRow,
  applyPatch: applyWidgetDetailPatch,
  auditSnapshot: formatWidgetDetailRow,
  canDelete: (ctx) => ctx.manifest.actions.includes("delete"),
};
