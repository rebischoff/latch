// DO NOT EDIT — generated from beta_detail.surface.yaml

import { defineSurfacePolicy } from "@latch/policy";
import { z } from "zod";

export const BetaDetailFieldIds = {
  headline: "headline",
  body: "body",
  priority: "priority",
  due_date: "due_date",
  assignee: "assignee",
  review_notes: "review_notes",
} as const;

export type BetaDetailFieldId = (typeof BetaDetailFieldIds)[keyof typeof BetaDetailFieldIds];

export const betaDetailColumnMap = {
  headline: ["fixture_beta.headline"],
  body: ["fixture_beta.body"],
  priority: ["fixture_beta.priority"],
  due_date: ["fixture_beta.due_date"],
  assignee: ["fixture_beta.assignee"],
  review_notes: ["fixture_beta.review_notes"],
} as const satisfies Record<BetaDetailFieldId, readonly string[]>;

/** Full read DTO keyed by Field id (narrow with `narrowSchema(..., manifest, 'read')`). */
export const BetaDetailSchema = z.object({
  id: z.string(),
  headline: z.object({
    headline: z.string(),
  }),
  body: z.object({
    body: z.string(),
  }),
  priority: z.object({
    priority: z.number(),
  }),
  due_date: z.object({
    due_date: z.string(),
  }),
  assignee: z.object({
    assignee: z.string(),
  }),
  review_notes: z.object({
    review_notes: z.string(),
  }),
});

/** PATCH body keyed by Field id (narrow with `narrowSchema(..., manifest, 'write')`). */
export const BetaDetailPatchSchema = z.object({
  headline: z
    .object({
      headline: z.string().optional(),
    })
    .optional(),
  body: z
    .object({
      body: z.string().optional(),
    })
    .optional(),
  priority: z
    .object({
      priority: z.number().optional(),
    })
    .optional(),
  due_date: z
    .object({
      due_date: z.string().optional(),
    })
    .optional(),
  assignee: z
    .object({
      assignee: z.string().optional(),
    })
    .optional(),
  review_notes: z
    .object({
      review_notes: z.string().optional(),
    })
    .optional(),
});

export type BetaDetailDto = z.infer<typeof BetaDetailSchema>;
export type BetaDetailPatchDto = z.infer<typeof BetaDetailPatchSchema>;

/** Policy vocabulary catalog for `definePolicyRegistry` (grants are runtime DB data). */
export const betaDetailSurfacePolicyDef = defineSurfacePolicy({
  surface: "beta_detail",
  fieldIds: Object.values(BetaDetailFieldIds),
  fieldActions: ["read", "write", "submit"],
  surfaceActions: ["read", "write"],
  kind: "business",
});
