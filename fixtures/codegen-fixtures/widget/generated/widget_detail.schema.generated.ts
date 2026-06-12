// DO NOT EDIT — generated from widget_detail.surface.yaml

import { defineSurfacePolicy } from "@latch/policy";
import { z } from "zod";

export const WidgetDetailFieldIds = {
  label: "label",
  status: "status",
  branch_scope: "branch_scope",
} as const;

export type WidgetDetailFieldId = (typeof WidgetDetailFieldIds)[keyof typeof WidgetDetailFieldIds];

export const widgetDetailColumnMap = {
  label: ["widgets.label"],
  status: ["widgets.status"],
  branch_scope: ["widgets.scope_id"],
} as const satisfies Record<WidgetDetailFieldId, readonly string[]>;

/** Full read DTO keyed by Field id (narrow with `narrowSchema(..., manifest, 'read')`). */
export const WidgetDetailSchema = z.object({
  id: z.string(),
  label: z.object({
    label: z.string(),
  }),
  status: z.object({
    status: z.string(),
  }),
  branch_scope: z.object({
    scope_id: z.string(),
  }),
});

/** PATCH body keyed by Field id (narrow with `narrowSchema(..., manifest, 'write')`). */
export const WidgetDetailPatchSchema = z.object({
  label: z
    .object({
      label: z.string().optional(),
    })
    .optional(),
  status: z
    .object({
      status: z.string().optional(),
    })
    .optional(),
  branch_scope: z
    .object({
      scope_id: z.string().optional(),
    })
    .optional(),
});

export type WidgetDetailDto = z.infer<typeof WidgetDetailSchema>;
export type WidgetDetailPatchDto = z.infer<typeof WidgetDetailPatchSchema>;

/** Policy vocabulary catalog for `definePolicyRegistry` (grants are runtime DB data). */
export const widgetDetailSurfacePolicyDef = defineSurfacePolicy({
  surface: "widget_detail",
  fieldIds: Object.values(WidgetDetailFieldIds),
  fieldActions: ["read", "write"],
  surfaceActions: ["read", "write"],
  kind: "business",
});
