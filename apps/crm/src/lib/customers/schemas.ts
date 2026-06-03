import { z } from "zod";

/**
 * Pilot `customer_detail` PATCH schema — keep aligned with
 * `apps/crm/modules/customer/generated/customer_detail.schema.generated.ts`.
 * `sites` is an array (join-backed child rows), mirroring `assignments` on `job_detail`.
 */
export const CustomerDetailPatchSchema = z.object({
  profile: z
    .object({
      name: z.string().optional(),
      phone: z.string().nullable().optional(),
    })
    .optional(),
  billing: z
    .object({
      billing_notes: z.string().nullable().optional(),
    })
    .optional(),
  sites: z.array(z.object({ label: z.string() })).optional(),
});

export type CustomerDetailPatchDto = z.infer<typeof CustomerDetailPatchSchema>;
