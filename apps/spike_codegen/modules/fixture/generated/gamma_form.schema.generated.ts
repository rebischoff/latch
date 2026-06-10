// DO NOT EDIT — generated from gamma_form.surface.yaml

import { defineSurfacePolicy } from "@latch/policy";
import { z } from "zod";

export const GammaFormFieldIds = {
  request_type: "request_type",
  justification: "justification",
  approver: "approver",
} as const;

export type GammaFormFieldId = (typeof GammaFormFieldIds)[keyof typeof GammaFormFieldIds];

export const gammaFormColumnMap = {
  request_type: ["fixture_gamma.request_type"],
  justification: ["fixture_gamma.justification"],
  approver: ["fixture_gamma.approver"],
} as const satisfies Record<GammaFormFieldId, readonly string[]>;

/** Full read DTO keyed by Field id (narrow with `narrowSchema(..., manifest, 'read')`). */
export const GammaFormSchema = z.object({
  id: z.string(),
  request_type: z.object({
    request_type: z.string(),
  }),
  justification: z.object({
    justification: z.string(),
  }),
  approver: z.object({
    approver: z.string(),
  }),
});

/** PATCH body keyed by Field id (narrow with `narrowSchema(..., manifest, 'write')`). */
export const GammaFormPatchSchema = z.object({
  request_type: z
    .object({
      request_type: z.string().optional(),
    })
    .optional(),
  justification: z
    .object({
      justification: z.string().optional(),
    })
    .optional(),
  approver: z
    .object({
      approver: z.string().optional(),
    })
    .optional(),
});

export type GammaFormDto = z.infer<typeof GammaFormSchema>;
export type GammaFormPatchDto = z.infer<typeof GammaFormPatchSchema>;

/** Policy vocabulary catalog for `definePolicyRegistry` (grants are runtime DB data). */
export const gammaFormSurfacePolicyDef = defineSurfacePolicy({
  surface: "gamma_form",
  fieldIds: Object.values(GammaFormFieldIds),
  fieldActions: ["read", "write", "approve", "submit"],
  surfaceActions: ["read", "write", "approve"],
  kind: "business",
});
