import { z } from "zod";

/**
 * Pilot `job_detail` PATCH schema — keep aligned with
 * `apps/web/modules/job/generated/job_detail.schema.generated.ts`
 * (codegen output; DAL cannot import apps/web per package boundaries).
 */
export const JobDetailPatchSchema = z.object({
  summary: z
    .object({
      title: z.string().optional(),
      status: z.string().optional(),
      scheduled_at: z.string().nullable().optional(),
    })
    .optional(),
  scope: z
    .object({
      description: z.string().nullable().optional(),
    })
    .optional(),
  financial_terms: z
    .object({
      contract_amount: z.string().nullable().optional(),
    })
    .optional(),
  assignments: z.array(z.object({ user_id: z.string() })).optional(),
});

export type JobDetailPatchDto = z.infer<typeof JobDetailPatchSchema>;
