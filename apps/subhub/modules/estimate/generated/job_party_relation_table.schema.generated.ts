// DO NOT EDIT — generated from job_party_relation_table.surface.yaml

import { defineSurfacePolicy } from "@latch/policy";
import { z } from "zod";

export const JobPartyRelationTableFieldIds = {
  display_name: "display_name",
  sort_order: "sort_order",
} as const;

export type JobPartyRelationTableFieldId = (typeof JobPartyRelationTableFieldIds)[keyof typeof JobPartyRelationTableFieldIds];

export const jobPartyRelationTableColumnMap = {
  display_name: ["job_party_relation.id", "job_party_relation.display_name"],
  sort_order: ["job_party_relation.sort_order"],
} as const satisfies Record<JobPartyRelationTableFieldId, readonly string[]>;

/** Full read DTO keyed by Field id (narrow with `narrowSchema(..., manifest, 'read')`). */
export const JobPartyRelationTableSchema = z.object({
  id: z.string(),
  display_name: z.object({
    id: z.string(),
    display_name: z.string(),
  }),
  sort_order: z.object({
    sort_order: z.number(),
  }),
});

/** PATCH body keyed by Field id (narrow with `narrowSchema(..., manifest, 'write')`). */
export const JobPartyRelationTablePatchSchema = z.object({
  display_name: z
    .object({
      id: z.string().optional(),
      display_name: z.string().optional(),
    })
    .optional(),
  sort_order: z
    .object({
      sort_order: z.number().optional(),
    })
    .optional(),
});

export type JobPartyRelationTableDto = z.infer<typeof JobPartyRelationTableSchema>;
export type JobPartyRelationTablePatchDto = z.infer<typeof JobPartyRelationTablePatchSchema>;

/** Policy vocabulary catalog for `definePolicyRegistry` (grants are runtime DB data). */
export const jobPartyRelationTableSurfacePolicyDef = defineSurfacePolicy({
  surface: "job_party_relation_table",
  fieldIds: Object.values(JobPartyRelationTableFieldIds),
  fieldActions: ["read", "write"],
  surfaceActions: ["read", "write", "delete"],
});
