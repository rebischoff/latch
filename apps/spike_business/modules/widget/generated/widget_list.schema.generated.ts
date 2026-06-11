// DO NOT EDIT — generated from widget_list.surface.yaml

import { defineSurfacePolicy } from "@latch/policy";
import { z } from "zod";

export const WidgetListFieldIds = {
  label: "label",
  status: "status",
} as const;

export type WidgetListFieldId = (typeof WidgetListFieldIds)[keyof typeof WidgetListFieldIds];

export const widgetListColumnMap = {
  label: ["widgets.label"],
  status: ["widgets.status"],
} as const satisfies Record<WidgetListFieldId, readonly string[]>;

/** Full read DTO keyed by Field id (narrow with `narrowSchema(..., manifest, 'read')`). */
export const WidgetListSchema = z.object({
  id: z.string(),
  label: z.object({
    label: z.string(),
  }),
  status: z.object({
    status: z.string(),
  }),
});

/** PATCH body keyed by Field id (narrow with `narrowSchema(..., manifest, 'write')`). */
export const WidgetListPatchSchema = z.object({
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
});

export type WidgetListDto = z.infer<typeof WidgetListSchema>;
export type WidgetListPatchDto = z.infer<typeof WidgetListPatchSchema>;

/** Policy vocabulary catalog for `definePolicyRegistry` (grants are runtime DB data). */
export const widgetListSurfacePolicyDef = defineSurfacePolicy({
  surface: "widget_list",
  fieldIds: Object.values(WidgetListFieldIds),
  fieldActions: ["read", "write"],
  surfaceActions: ["read", "write"],
  kind: "business",
});
