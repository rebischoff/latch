import { z } from "zod";

/** @see docs/foundations/global-options.md */
export const LIST_DEFAULT_PAGE_SIZE = 50;
export const LIST_MAX_PAGE_SIZE = 200;

/**
 * Pilot `job_list` list query — keep aligned with task 00 / global-options.
 */
export const JobListQuerySchema = z.object({
  status: z.string().optional(),
  limit: z
    .number()
    .int()
    .positive()
    .max(LIST_MAX_PAGE_SIZE, {
      message: `limit must not exceed ${LIST_MAX_PAGE_SIZE}`,
    })
    .optional(),
  offset: z.number().int().nonnegative().optional(),
});

export type JobListQueryDto = z.infer<typeof JobListQuerySchema>;

/**
 * Pilot `job_list` read DTO — keep aligned with
 * `apps/web/modules/job/generated/job_list.schema.generated.ts`.
 */
export const JobListRowSchema = z.object({
  id: z.string(),
  summary: z
    .object({
      id: z.string(),
      title: z.string(),
      status: z.string(),
      scheduled_at: z.string().nullable(),
    })
    .optional(),
  customer_site: z
    .object({
      name: z.string(),
      label: z.string(),
    })
    .optional(),
  financial_terms: z
    .object({
      contract_amount: z.string().nullable(),
    })
    .optional(),
  assignments: z.array(z.object({ user_id: z.string() })).optional(),
});

export type JobListRowDto = z.infer<typeof JobListRowSchema>;

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

/**
 * Pilot `job_list` PATCH schema — keep aligned with
 * `apps/web/modules/job/generated/job_list.schema.generated.ts`.
 */
export const JobListPatchSchema = z.object({
  summary: z
    .object({
      id: z.string().optional(),
      title: z.string().optional(),
      status: z.string().optional(),
      scheduled_at: z.string().nullable().optional(),
    })
    .optional(),
  customer_site: z
    .object({
      name: z.string().optional(),
      label: z.string().optional(),
    })
    .optional(),
  financial_terms: z
    .object({
      contract_amount: z.string().nullable().optional(),
    })
    .optional(),
  assignments: z.array(z.object({ user_id: z.string() })).optional(),
});

export type JobListPatchDto = z.infer<typeof JobListPatchSchema>;

/** @see docs/foundations/global-options.md */
export const BULK_MAX_BATCH = 500;
