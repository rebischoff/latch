// DO NOT EDIT — generated from delta_report.surface.yaml

import type { Manifest } from "@latch/contracts";
import type { SurfaceDescriptor } from "@latch/dal";
import { z } from "zod";

import {
  DeltaReportPatchSchema,
} from "./delta_report.schema.generated.js";

export type DeltaReportRow = {
  export_format: string;
  metric_a: number;
  metric_b: number;
  metric_c: number;
  period_end: string;
  period_start: string;
  region: string;
  summary_text: string;
};

const formatDeltaReportRow = (row: DeltaReportRow): Record<string, unknown> => ({
  export_format: row.export_format,
  metric_a: row.metric_a,
  metric_b: row.metric_b,
  metric_c: row.metric_c,
  period_end: row.period_end,
  period_start: row.period_start,
  region: row.region,
  summary_text: row.summary_text,
});

export const projectDeltaReportRow = (
  row: DeltaReportRow,
  manifest: Manifest,
  _related: unknown,
  _listJoins?: Record<string, unknown>,
): Record<string, unknown> => {
  const dto: Record<string, unknown> = { id: row.id };

  if (manifest.fields.period_start?.includes("read")) {
    dto.period_start = { period_start: row.period_start };
  }
  if (manifest.fields.period_end?.includes("read")) {
    dto.period_end = { period_end: row.period_end };
  }
  if (manifest.fields.region?.includes("read")) {
    dto.region = { region: row.region };
  }
  if (manifest.fields.metric_a?.includes("read")) {
    dto.metric_a = { metric_a: row.metric_a };
  }
  if (manifest.fields.metric_b?.includes("read")) {
    dto.metric_b = { metric_b: row.metric_b };
  }
  if (manifest.fields.metric_c?.includes("read")) {
    dto.metric_c = { metric_c: row.metric_c };
  }
  if (manifest.fields.summary_text?.includes("read")) {
    dto.summary_text = { summary_text: row.summary_text };
  }
  if (manifest.fields.export_format?.includes("read")) {
    dto.export_format = { export_format: row.export_format };
  }
  return dto;
};

export const applyDeltaReportPatch = (
  row: DeltaReportRow,
  patch: Record<string, unknown>,
): DeltaReportRow => {
  const next = { ...row };
  const typed = patch as z.infer<typeof DeltaReportPatchSchema>;

  if (typed.period_start?.period_start !== undefined) {
    next.period_start = typed.period_start.period_start;
  }
  if (typed.period_end?.period_end !== undefined) {
    next.period_end = typed.period_end.period_end;
  }
  if (typed.region?.region !== undefined) {
    next.region = typed.region.region;
  }
  if (typed.metric_a?.metric_a !== undefined) {
    next.metric_a = typed.metric_a.metric_a;
  }
  if (typed.metric_b?.metric_b !== undefined) {
    next.metric_b = typed.metric_b.metric_b;
  }
  if (typed.metric_c?.metric_c !== undefined) {
    next.metric_c = typed.metric_c.metric_c;
  }
  if (typed.summary_text?.summary_text !== undefined) {
    next.summary_text = typed.summary_text.summary_text;
  }
  if (typed.export_format?.export_format !== undefined) {
    next.export_format = typed.export_format.export_format;
  }
  return next;
};

export const deltaReportDescriptor: SurfaceDescriptor<DeltaReportRow> = {
  surfaceId: "delta_report",
  anchorTable: "fixture_delta",
  capabilities: ["detail"],
  patchSchema: DeltaReportPatchSchema,
  deleteAuditFieldId: "period_start",
  projectRow: projectDeltaReportRow,
  applyPatch: applyDeltaReportPatch,
  auditSnapshot: formatDeltaReportRow,
  canDelete: (ctx) => ctx.manifest.actions.includes("delete"),
};
