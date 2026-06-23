import { z } from "zod";

export {
  applySiteContactRelationTablePatch,
  projectSiteContactRelationTableRow,
  siteContactRelationTableDescriptor,
  type SiteContactRelationTableRow,
} from "../../../modules/site/generated/site_contact_relation_table.glue.generated";

/** POST body — same field-keyed shape as PATCH; `display_name` required. */
export const SiteContactRelationTableCreateSchema = z
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

const SiteContactRelationTableReplaceElementSchema = z
  .object({
    id: z.string().optional(),
    display_name: z.string().min(1),
  })
  .strict();

/** Catalog page Save — replace-array sync. */
export const SiteContactRelationTableReplaceSchema = z
  .object({
    rows: z.array(SiteContactRelationTableReplaceElementSchema),
  })
  .strict();

export type SiteContactRelationTableReplaceRow = z.infer<
  typeof SiteContactRelationTableReplaceElementSchema
>;
