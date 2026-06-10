// DO NOT EDIT — generated from delta_report.surface.yaml

import { defineSurfacePolicy } from "@latch/policy";
import { z } from "zod";

export const DeltaReportFieldIds = {
  period_start: "period_start",
  period_end: "period_end",
  region: "region",
  metric_a: "metric_a",
  metric_b: "metric_b",
  metric_c: "metric_c",
  summary_text: "summary_text",
  export_format: "export_format",
} as const;

export type DeltaReportFieldId = (typeof DeltaReportFieldIds)[keyof typeof DeltaReportFieldIds];

export const deltaReportColumnMap = {
  period_start: ["fixture_delta.period_start"],
  period_end: ["fixture_delta.period_end"],
  region: ["fixture_delta.region"],
  metric_a: ["fixture_delta.metric_a"],
  metric_b: ["fixture_delta.metric_b"],
  metric_c: ["fixture_delta.metric_c"],
  summary_text: ["fixture_delta.summary_text"],
  export_format: ["fixture_delta.export_format"],
} as const satisfies Record<DeltaReportFieldId, readonly string[]>;

/** Full read DTO keyed by Field id (narrow with `narrowSchema(..., manifest, 'read')`). */
export const DeltaReportSchema = z.object({
  id: z.string(),
  period_start: z.object({
    period_start: z.string(),
  }),
  period_end: z.object({
    period_end: z.string(),
  }),
  region: z.object({
    region: z.string(),
  }),
  metric_a: z.object({
    metric_a: z.number(),
  }),
  metric_b: z.object({
    metric_b: z.number(),
  }),
  metric_c: z.object({
    metric_c: z.number(),
  }),
  summary_text: z.object({
    summary_text: z.string(),
  }),
  export_format: z.object({
    export_format: z.string(),
  }),
});

/** PATCH body keyed by Field id (narrow with `narrowSchema(..., manifest, 'write')`). */
export const DeltaReportPatchSchema = z.object({
  period_start: z
    .object({
      period_start: z.string().optional(),
    })
    .optional(),
  period_end: z
    .object({
      period_end: z.string().optional(),
    })
    .optional(),
  region: z
    .object({
      region: z.string().optional(),
    })
    .optional(),
  metric_a: z
    .object({
      metric_a: z.number().optional(),
    })
    .optional(),
  metric_b: z
    .object({
      metric_b: z.number().optional(),
    })
    .optional(),
  metric_c: z
    .object({
      metric_c: z.number().optional(),
    })
    .optional(),
  summary_text: z
    .object({
      summary_text: z.string().optional(),
    })
    .optional(),
  export_format: z
    .object({
      export_format: z.string().optional(),
    })
    .optional(),
});

export type DeltaReportDto = z.infer<typeof DeltaReportSchema>;
export type DeltaReportPatchDto = z.infer<typeof DeltaReportPatchSchema>;

/** Policy vocabulary catalog for `definePolicyRegistry` (grants are runtime DB data). */
export const deltaReportSurfacePolicyDef = defineSurfacePolicy({
  surface: "delta_report",
  fieldIds: Object.values(DeltaReportFieldIds),
  fieldActions: ["read", "write"],
  surfaceActions: ["read", "write"],
  kind: "business",
});
