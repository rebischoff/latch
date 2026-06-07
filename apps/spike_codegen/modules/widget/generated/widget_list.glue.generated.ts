// DO NOT EDIT — generated from widget_list.surface.yaml

import type { Manifest } from "@latch/contracts";
import type { SurfaceDescriptor } from "@latch/dal";
import { z } from "zod";

import {
  WidgetListPatchSchema,
} from "./widget_list.schema.generated.js";


export const WidgetListListQuerySchema = z.object({
  status: z.string().optional(),
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().nonnegative().optional(),
});
export type WidgetListRow = {
  id: string;
  label: string;
  status: string;
};

const formatWidgetListRow = (row: WidgetListRow): Record<string, unknown> => ({
  id: row.id,
  label: row.label,
  status: row.status,
});

export const projectWidgetListRow = (
  row: WidgetListRow,
  manifest: Manifest,
  _related: unknown,
  _listJoins?: Record<string, unknown>,
): Record<string, unknown> => {
  const dto: Record<string, unknown> = { id: row.id };

  if (manifest.fields.summary?.includes("read")) {
    dto.summary = { id: row.id, label: row.label };
  }
  if (manifest.fields.status?.includes("read")) {
    dto.status = { status: row.status };
  }
  return dto;
};

export const applyWidgetListPatch = (
  row: WidgetListRow,
  patch: Record<string, unknown>,
): WidgetListRow => {
  const next = { ...row };
  const typed = patch as z.infer<typeof WidgetListPatchSchema>;

  if (typed.summary?.id !== undefined) {
    next.id = typed.summary.id;
  }
  if (typed.summary?.label !== undefined) {
    next.label = typed.summary.label;
  }
  if (typed.status?.status !== undefined) {
    next.status = typed.status.status;
  }
  return next;
};

export const widgetListDescriptor: SurfaceDescriptor<WidgetListRow> = {
  surfaceId: "widget_list",
  anchorTable: "widgets",
  capabilities: ["list"],
  patchSchema: WidgetListPatchSchema,
  listQuerySchema: WidgetListListQuerySchema,
  listDefaultPageSize: 50,
  deleteAuditFieldId: "summary",
  projectRow: projectWidgetListRow,
  applyPatch: applyWidgetListPatch,
  auditSnapshot: formatWidgetListRow,
  canDelete: (ctx) => ctx.manifest.actions.includes("delete"),
};
