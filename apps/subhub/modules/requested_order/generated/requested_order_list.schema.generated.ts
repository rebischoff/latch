// DO NOT EDIT — generated from requested_order_list.surface.yaml

import { defineSurfacePolicy } from "@latch/policy";
import { z } from "zod";

export const RequestedOrderListFieldIds = {
  summary: "summary",
} as const;

export type RequestedOrderListFieldId = (typeof RequestedOrderListFieldIds)[keyof typeof RequestedOrderListFieldIds];

export const requestedOrderListColumnMap = {
  summary: ["requested_order.id", "requested_order.job_id", "job.title", "requested_order.requested_at", "requested_order.note"],
} as const satisfies Record<RequestedOrderListFieldId, readonly string[]>;

/** Full read DTO keyed by Field id (narrow with `narrowSchema(..., manifest, 'read')`). */
export const RequestedOrderListSchema = z.object({
  id: z.string(),
  summary: z.object({
    id: z.string(),
    job_id: z.string(),
    title: z.string(),
    requested_at: z.string(),
    note: z.string(),
  }),
});

/** PATCH body keyed by Field id (narrow with `narrowSchema(..., manifest, 'write')`). */
export const RequestedOrderListPatchSchema = z.object({
  summary: z
    .object({
      id: z.string().optional(),
      job_id: z.string().optional(),
      title: z.string().optional(),
      requested_at: z.string().optional(),
      note: z.string().optional(),
    })
    .optional(),
});

export type RequestedOrderListDto = z.infer<typeof RequestedOrderListSchema>;
export type RequestedOrderListPatchDto = z.infer<typeof RequestedOrderListPatchSchema>;

/** Policy vocabulary catalog for `definePolicyRegistry` (grants are runtime DB data). */
export const requestedOrderListSurfacePolicyDef = defineSurfacePolicy({
  surface: "requested_order_list",
  fieldIds: Object.values(RequestedOrderListFieldIds),
  fieldActions: ["read", "write"],
  surfaceActions: ["read"],
});
