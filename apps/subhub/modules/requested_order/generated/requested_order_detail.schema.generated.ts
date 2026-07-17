// DO NOT EDIT — generated from requested_order_detail.surface.yaml

import { defineSurfacePolicy } from "@latch/policy";
import { z } from "zod";

export const RequestedOrderDetailFieldIds = {
  profile: "profile",
  line_items: "line_items",
} as const;

export type RequestedOrderDetailFieldId = (typeof RequestedOrderDetailFieldIds)[keyof typeof RequestedOrderDetailFieldIds];

export const requestedOrderDetailColumnMap = {
  profile: ["requested_order.id", "requested_order.job_id", "requested_order.requested_by", "requested_order.requested_at", "requested_order.note"],
  line_items: [],
} as const satisfies Record<RequestedOrderDetailFieldId, readonly string[]>;

/** Full read DTO keyed by Field id (narrow with `narrowSchema(..., manifest, 'read')`). */
export const RequestedOrderDetailSchema = z.object({
  id: z.string(),
  profile: z.object({
    id: z.string(),
    job_id: z.string(),
    requested_by: z.string().nullable(),
    requested_at: z.string(),
    note: z.string(),
  }),
  line_items: z.array(z.object({ user_id: z.string() })),
});

/** PATCH body keyed by Field id (narrow with `narrowSchema(..., manifest, 'write')`). */
export const RequestedOrderDetailPatchSchema = z.object({
  profile: z
    .object({
      id: z.string().optional(),
      job_id: z.string().optional(),
      requested_by: z.string().nullable().optional(),
      requested_at: z.string().optional(),
      note: z.string().optional(),
    })
    .optional(),
  line_items: z.array(z.object({ user_id: z.string() })).optional(),
});

export type RequestedOrderDetailDto = z.infer<typeof RequestedOrderDetailSchema>;
export type RequestedOrderDetailPatchDto = z.infer<typeof RequestedOrderDetailPatchSchema>;

/** Policy vocabulary catalog for `definePolicyRegistry` (grants are runtime DB data). */
export const requestedOrderDetailSurfacePolicyDef = defineSurfacePolicy({
  surface: "requested_order_detail",
  fieldIds: Object.values(RequestedOrderDetailFieldIds),
  fieldActions: ["read", "write"],
  surfaceActions: ["read", "write", "delete"],
});
