import { z } from "zod";

export {
  applyJobPartyRelationTablePatch,
  jobPartyRelationTableDescriptor,
  projectJobPartyRelationTableRow,
  type JobPartyRelationTableRow,
} from "../../../modules/estimate/generated/job_party_relation_table.glue.generated";

/** POST body — same field-keyed shape as PATCH; `display_name` required. */
export const JobPartyRelationTableCreateSchema = z
  .object({
    display_name: z
      .object({
        display_name: z.string().min(1),
      })
      .strict(),
    sort_order: z
      .object({
        sort_order: z.number().int(),
      })
      .strict()
      .optional(),
  })
  .strict();

const JobPartyRelationTableReplaceElementSchema = z
  .object({
    id: z.string().optional(),
    display_name: z.string().min(1),
  })
  .strict();

/** Catalog page Save — replace-array sync. */
export const JobPartyRelationTableReplaceSchema = z
  .object({
    rows: z.array(JobPartyRelationTableReplaceElementSchema),
  })
  .strict();

export type JobPartyRelationTableReplaceRow = z.infer<
  typeof JobPartyRelationTableReplaceElementSchema
>;
