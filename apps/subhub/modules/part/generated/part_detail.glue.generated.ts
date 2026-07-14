// DO NOT EDIT — generated from part_detail.surface.yaml

import type { Manifest } from "@latch/contracts";
import type { SurfaceDescriptor } from "@latch/dal";
import { z } from "zod";

import {
  PartDetailPatchSchema,
} from "./part_detail.schema.generated";

export type PartDetailRow = {
  description: string;
  discontinued: boolean;
  id: string;
  manufacturer_party_id: string;
  mpn: string;
  purchase_unit: string | null;
  unit: string;
  units_per_purchase: number;
};

const formatPartDetailRow = (row: PartDetailRow): Record<string, unknown> => ({
  description: row.description,
  discontinued: row.discontinued,
  id: row.id,
  manufacturer_party_id: row.manufacturer_party_id,
  mpn: row.mpn,
  purchase_unit: row.purchase_unit,
  unit: row.unit,
  units_per_purchase: row.units_per_purchase,
});

export const projectPartDetailRow = (
  row: PartDetailRow,
  manifest: Manifest,
  _related: unknown,
  _listJoins?: Record<string, unknown>,
): Record<string, unknown> => {
  const dto: Record<string, unknown> = { id: row.id };

  if (manifest.fields.profile?.includes("read")) {
    dto.profile = { id: row.id, manufacturer_party_id: row.manufacturer_party_id, mpn: row.mpn, description: row.description, unit: row.unit, purchase_unit: row.purchase_unit, units_per_purchase: row.units_per_purchase, discontinued: row.discontinued };
  }
  return dto;
};

export const applyPartDetailPatch = (
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
  if (typed.profile?.discontinued !== undefined) {
    next.discontinued = typed.profile.discontinued;
  }
  return next;
};

export const partDetailDescriptor: SurfaceDescriptor<PartDetailRow> = {
  surfaceId: "part_detail",
  anchorTable: "manufacturer_part",
  capabilities: ["detail"],
  patchSchema: PartDetailPatchSchema,
  deleteAuditFieldId: "profile",
  projectRow: projectPartDetailRow,
  applyPatch: applyPartDetailPatch,
  auditSnapshot: formatPartDetailRow,
  canDelete: (ctx) => ctx.manifest.actions.includes("delete"),
};
