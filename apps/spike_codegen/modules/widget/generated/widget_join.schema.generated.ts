// DO NOT EDIT — generated from widget_join.surface.yaml

import { defineSurfacePolicy } from "@latch/policy";
import { z } from "zod";

export const WidgetJoinFieldIds = {
  summary: "summary",
  tags: "tags",
} as const;

export type WidgetJoinFieldId = (typeof WidgetJoinFieldIds)[keyof typeof WidgetJoinFieldIds];

export const widgetJoinColumnMap = {
  summary: ["widgets.id", "widgets.label"],
  tags: ["widget_tags.tag"],
} as const satisfies Record<WidgetJoinFieldId, readonly string[]>;

/** Full read DTO keyed by Field id (narrow with `narrowSchema(..., manifest, 'read')`). */
export const WidgetJoinSchema = z.object({
  id: z.string(),
  summary: z.object({
    id: z.string(),
    label: z.string(),
  }),
  tags: z.object({
    tag: z.string(),
  }),
});

/** PATCH body keyed by Field id (narrow with `narrowSchema(..., manifest, 'write')`). */
export const WidgetJoinPatchSchema = z.object({
  summary: z
    .object({
      id: z.string().optional(),
      label: z.string().optional(),
    })
    .optional(),
  tags: z
    .object({
      tag: z.string().optional(),
    })
    .optional(),
});

export type WidgetJoinDto = z.infer<typeof WidgetJoinSchema>;
export type WidgetJoinPatchDto = z.infer<typeof WidgetJoinPatchSchema>;

/** Policy vocabulary catalog for `definePolicyRegistry` (grants are runtime DB data). */
export const widgetJoinSurfacePolicyDef = defineSurfacePolicy({
  surface: "widget_join",
  fieldIds: Object.values(WidgetJoinFieldIds),
  fieldActions: ["read", "write", "submit", "delete", "restore", "approve", "hard_delete"],
  surfaceActions: ["read", "write", "submit", "delete", "restore", "approve", "hard_delete"],
});
