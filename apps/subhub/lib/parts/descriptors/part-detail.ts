import type { Manifest } from "@latch/contracts";
import type { SurfaceDescriptor } from "@latch/dal";
import { z } from "zod";

const VendorPricingPatchElementSchema = z
  .object({
    id: z.string().optional(),
    vendor_party_id: z.string(),
    vendor_pn: z.string(),
    vendor_description: z.string(),
    unit_price: z.number(),
    is_preferred: z.boolean(),
  })
  .strict();

const ItemLinkPatchElementSchema = z
  .object({
    item_id: z.string(),
    sort_order: z.number().optional(),
  })
  .strict();

const PartSpecPatchElementSchema = z
  .object({
    spec_def_id: z.string(),
    spec_option_id: z.string().nullable().optional(),
    value_number: z.number().nullable().optional(),
    value_number_max: z.number().nullable().optional(),
    value_boolean: z.boolean().nullable().optional(),
  })
  .strict();

/** Hand-written — codegen stubs collections with placeholder `user_id`. */
export const PartDetailPatchSchema = z
  .object({
    profile: z
      .object({
        id: z.string().optional(),
        manufacturer_party_id: z.string().optional(),
        mpn: z.string().optional(),
        description: z.string().optional(),
        unit: z.string().optional(),
        purchase_unit: z.string().nullable().optional(),
        units_per_purchase: z.number().optional(),
      })
      .strict()
      .optional(),
    vendor_pricing: z.array(VendorPricingPatchElementSchema).optional(),
    item_links: z.array(ItemLinkPatchElementSchema).optional(),
    part_specs: z.array(PartSpecPatchElementSchema).optional(),
  })
  .strict();

/** POST body — `profile.manufacturer_party_id`, `profile.mpn`, `profile.description` required. */
export const PartDetailCreateSchema = z
  .object({
    profile: z
      .object({
        manufacturer_party_id: z.string(),
        mpn: z.string().min(1),
        description: z.string(),
        unit: z.string().optional(),
        purchase_unit: z.string().nullable().optional(),
        units_per_purchase: z.number().optional(),
      })
      .strict(),
    vendor_pricing: z.array(VendorPricingPatchElementSchema).optional(),
    item_links: z.array(ItemLinkPatchElementSchema).optional(),
    part_specs: z.array(PartSpecPatchElementSchema).optional(),
  })
  .strict();

export type PartDetailRow = {
  description: string;
  id: string;
  manufacturer_display_name: string;
  manufacturer_party_id: string;
  mpn: string;
  purchase_unit: string | null;
  unit: string;
  units_per_purchase: number;
};

export type VendorPricingRow = {
  id: string;
  is_preferred: boolean;
  unit_price: number;
  vendor_description: string;
  vendor_display_name: string;
  vendor_party_id: string;
  vendor_pn: string;
};

export type ItemLinkRow = {
  breadcrumb: string;
  item_id: string;
  name: string;
  sort_order: number;
};

export type PartSpecRow = {
  code: string;
  display_name: string;
  option_display_name: string | null;
  spec_def_id: string;
  spec_option_id: string | null;
  value_boolean: boolean | null;
  value_number: number | null;
  value_number_max: number | null;
  value_type: "boolean" | "enum" | "number";
};

export type PartDetailRelated = {
  item_links: ItemLinkRow[];
  part_specs: PartSpecRow[];
  vendor_pricing: VendorPricingRow[];
};

export type VendorPricingPatchRow = z.infer<typeof VendorPricingPatchElementSchema>;
export type ItemLinkPatchRow = z.infer<typeof ItemLinkPatchElementSchema>;
export type PartSpecPatchRow = z.infer<typeof PartSpecPatchElementSchema>;

export type PartDetailRelatedPatch = {
  item_links?: ItemLinkPatchRow[];
  part_specs?: PartSpecPatchRow[];
  vendor_pricing?: VendorPricingPatchRow[];
};

export type PartDetailStoreRelated = PartDetailRelated | PartDetailRelatedPatch;

export type PartDetailWriteRow = Pick<
  PartDetailRow,
  | "id"
  | "manufacturer_party_id"
  | "mpn"
  | "description"
  | "unit"
  | "purchase_unit"
  | "units_per_purchase"
>;

const formatPartDetailRow = (row: PartDetailRow): Record<string, unknown> => ({
  description: row.description,
  id: row.id,
  manufacturer_party_id: row.manufacturer_party_id,
  mpn: row.mpn,
  purchase_unit: row.purchase_unit,
  unit: row.unit,
  units_per_purchase: row.units_per_purchase,
});

const normalizePartDetailRelated = (
  related: PartDetailStoreRelated,
): PartDetailRelated => ({
  vendor_pricing: (related.vendor_pricing ?? []) as VendorPricingRow[],
  item_links: (related.item_links ?? []) as ItemLinkRow[],
  part_specs: (related.part_specs ?? []) as PartSpecRow[],
});

export const projectPartDetailRow = (
  row: PartDetailRow,
  manifest: Manifest,
  related: PartDetailStoreRelated,
): Record<string, unknown> => {
  const normalized = normalizePartDetailRelated(related);
  const dto: Record<string, unknown> = { id: row.id };

  if (manifest.fields.profile?.includes("read")) {
    dto.profile = {
      id: row.id,
      manufacturer_party_id: row.manufacturer_party_id,
      manufacturer_display_name: row.manufacturer_display_name,
      mpn: row.mpn,
      description: row.description,
      unit: row.unit,
      purchase_unit: row.purchase_unit,
      units_per_purchase: row.units_per_purchase,
    };
  }

  if (manifest.fields.vendor_pricing?.includes("read")) {
    dto.vendor_pricing = normalized.vendor_pricing;
  }

  if (manifest.fields.item_links?.includes("read")) {
    dto.item_links = normalized.item_links;
  }

  if (manifest.fields.part_specs?.includes("read")) {
    dto.part_specs = normalized.part_specs;
  }

  return dto;
};

const applyPartDetailPatch = (
  row: PartDetailRow,
  patch: Record<string, unknown>,
): PartDetailRow => {
  const next = { ...row };
  const typed = patch as z.infer<typeof PartDetailPatchSchema>;

  if (typed.profile?.id !== undefined) {
    next.id = typed.profile.id;
  }
  if (typed.profile?.manufacturer_party_id !== undefined) {
    next.manufacturer_party_id = typed.profile.manufacturer_party_id;
  }
  if (typed.profile?.mpn !== undefined) {
    next.mpn = typed.profile.mpn;
  }
  if (typed.profile?.description !== undefined) {
    next.description = typed.profile.description;
  }
  if (typed.profile?.unit !== undefined) {
    next.unit = typed.profile.unit;
  }
  if (typed.profile?.purchase_unit !== undefined) {
    next.purchase_unit = typed.profile.purchase_unit;
  }
  if (typed.profile?.units_per_purchase !== undefined) {
    next.units_per_purchase = typed.profile.units_per_purchase;
  }

  return next;
};

export const partDetailDescriptor: SurfaceDescriptor<
  PartDetailRow,
  PartDetailStoreRelated
> = {
  surfaceId: "part_detail",
  anchorTable: "manufacturer_part",
  capabilities: ["detail"],
  patchSchema: PartDetailPatchSchema,
  deleteAuditFieldId: "profile",
  projectRow: projectPartDetailRow,
  applyPatch: applyPartDetailPatch,
  applyRelatedPatch: (_entityId, patch) => {
    const typed = patch as z.infer<typeof PartDetailPatchSchema>;
    const related: PartDetailRelatedPatch = {};

    if (typed.vendor_pricing !== undefined) {
      related.vendor_pricing = typed.vendor_pricing;
    }
    if (typed.item_links !== undefined) {
      related.item_links = typed.item_links;
    }
    if (typed.part_specs !== undefined) {
      related.part_specs = typed.part_specs;
    }

    return Object.keys(related).length > 0 ? related : undefined;
  },
  auditSnapshot: formatPartDetailRow,
  deleteAuditSnapshot: (row, related) => ({
    ...formatPartDetailRow(row),
    vendor_pricing: normalizePartDetailRelated(related).vendor_pricing,
    item_links: normalizePartDetailRelated(related).item_links,
    part_specs: normalizePartDetailRelated(related).part_specs,
  }),
  canDelete: (ctx) => ctx.manifest.actions.includes("delete"),
};
